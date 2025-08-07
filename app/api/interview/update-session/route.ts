import { NextRequest, NextResponse } from 'next/server';
import { verifyInterviewSession, RedisSessionManager } from '@/lib/auth/redis-session';

export async function POST(request: NextRequest) {
  try {
    const { interviewId, faceVerificationData, locationData } = await request.json();

    // Verify interview session
    const session = await verifyInterviewSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Please complete OTP verification first.' },
        { status: 401 }
      );
    }

    // Update session with verification data
    const sessionUpdated = await RedisSessionManager.updateSession(session.id, {
      interviewId,
      faceVerificationData,
      candidateLocation: locationData?.gps?.latitude ? 
        `${locationData.gps.latitude}, ${locationData.gps.longitude}` : 
        locationData?.ip?.city || 'Unknown',
      candidateIP: locationData?.ip?.ip || 'Unknown',
      metadata: {
        ...session.metadata,
        faceVerification: faceVerificationData,
        locationInfo: locationData,
        verificationCompletedAt: new Date().toISOString(),
      }
    });

    if (!sessionUpdated) {
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      );
    }

    console.log(`✅ Session updated with verification data for ${session.email}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Session updated successfully'
    });

  } catch (error) {
    console.error('Update session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}