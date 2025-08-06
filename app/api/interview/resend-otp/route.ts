import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Generate new OTP (6-digit code)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // TODO: Store the new OTP in cache/database with expiration time
    // TODO: Send the OTP via email
    console.log(`New OTP for ${email}: ${otp}`);

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