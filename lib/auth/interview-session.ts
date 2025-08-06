import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

export interface InterviewSession {
  email: string;
  purpose: 'interview_access';
  verified: boolean;
  timestamp: number;
}

export function verifyInterviewSession(request: NextRequest): InterviewSession | null {
  try {
    const token = request.cookies.get('interview-session')?.value;
    
    if (!token) {
      return null;
    }

    const decoded = jwt.verify(
      token,
      process.env.AUTH_SECRET || 'fallback-secret'
    ) as InterviewSession;

    // Verify the token is for interview access and is verified
    if (decoded.purpose !== 'interview_access' || !decoded.verified) {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('Interview session verification error:', error);
    return null;
  }
}

export function extractEmailFromSession(request: NextRequest): string | null {
  const session = verifyInterviewSession(request);
  return session?.email || null;
}