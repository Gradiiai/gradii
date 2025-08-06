import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { otpCodes } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { sendOTPEmail } from '@/lib/services/email/otp';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Generate new OTP (6-digit code)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log(`New OTP for ${email}: ${otp}`);

    // Delete any existing OTPs for this email
    await db
      .delete(otpCodes)
      .where(
        and(
          eq(otpCodes.email, email),
          eq(otpCodes.purpose, 'candidate_access')
        )
      );

    // Store new OTP in database with 5-minute expiration
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
      console.error(`Failed to send resend OTP email to ${email}`);
      // Still return success since OTP is stored, user can try again
    }

    return NextResponse.json({ 
      success: true, 
      message: 'New OTP sent to your email address'
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}