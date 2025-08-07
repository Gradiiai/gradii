import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { otpCodes } from '@/lib/database/schema';
import { eq, and, gte, isNull } from 'drizzle-orm';
import { RedisSessionManager, setSessionCookie, getClientIP, getLocationFromIP } from '@/lib/auth/redis-session';

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    // Verify OTP from database
    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return NextResponse.json({ error: 'Invalid OTP format' }, { status: 400 });
    }

    // Find valid OTP in database
    const [validOtp] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.email, email),
          eq(otpCodes.otp, otp),
          eq(otpCodes.purpose, 'candidate_access'),
          gte(otpCodes.expiresAt, new Date()),
          isNull(otpCodes.usedAt)
        )
      )
      .limit(1);

    if (!validOtp) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    // Check attempt limits
    if ((validOtp.attempts || 0) >= (validOtp.maxAttempts || 3)) {
      return NextResponse.json({ error: 'Too many attempts. Request a new OTP.' }, { status: 400 });
    }

    // Mark OTP as used
    await db
      .update(otpCodes)
      .set({ usedAt: new Date() })
      .where(eq(otpCodes.id, validOtp.id));

    console.log(`OTP verified for ${email}: ${otp}`);

    // Get client information for enhanced security
    const clientIP = await getClientIP(request);
    const candidateLocation = await getLocationFromIP(clientIP);
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Create Redis session with client information
    const sessionId = await RedisSessionManager.createSession(email, {
      candidateLocation: candidateLocation || undefined,
      candidateIP: clientIP,
      userAgent,
      metadata: {
        otpVerifiedAt: new Date().toISOString(),
        verificationIP: clientIP,
      }
    });

    // Create response and set secure cookie
    const response = NextResponse.json({ 
      success: true, 
      message: 'OTP verified successfully'
    });

    // Set secure HTTP-only cookie for interview access
    setSessionCookie(response, sessionId);

    return response;

  } catch (error) {
    console.error('OTP verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}