import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { otpCodes, Interview, candidates } from '@/lib/database/schema';
import { eq, and, gte, or } from 'drizzle-orm';
import { sendOTPEmail } from '@/lib/services/email/otp';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if there are any interviews for this email
    const interviews = await db
      .select()
      .from(Interview)
      .where(eq(Interview.candidateEmail, email))
      .limit(1);

    if (interviews.length === 0) {
      // Also check in candidates table
      const candidate = await db
        .select()
        .from(candidates)
        .where(eq(candidates.email, email))
        .limit(1);

      if (candidate.length === 0) {
        return NextResponse.json(
          { error: 'No interview found for this email address' },
          { status: 404 }
        );
      }
    }

    // Generate OTP (6-digit code)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log(`OTP for ${email}: ${otp}`);

    // Store OTP in database with 5-minute expiration
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    
    await db.insert(otpCodes).values({
      email,
      otp,
      purpose: 'candidate_access',
      expiresAt,
      attempts: 0,
      maxAttempts: 3
    });

    // Send OTP email using email service
    const emailSent = await sendOTPEmail(email, otp, 'candidate_access');
    
    if (!emailSent) {
      console.error(`Failed to send OTP email to ${email}`);
      // Still return success since OTP is stored, user can try resending
    }

    return NextResponse.json({ 
      success: true, 
      message: 'OTP sent to your email address'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}