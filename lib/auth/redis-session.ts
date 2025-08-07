import { getRedisClient } from '@/lib/redis/connection';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export interface InterviewSession {
  id: string;
  email: string;
  interviewId?: string;
  interviewType?: string;
  purpose: 'interview_access';
  verified: boolean;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
  candidateLocation?: string;
  candidateIP?: string;
  userAgent?: string;
  faceVerificationData?: any;
  metadata?: any;
}

export class RedisSessionManager {
  private static readonly SESSION_PREFIX = 'interview_session:';
  private static readonly SESSION_TIMEOUT = 2 * 60 * 60; // 2 hours
  private static readonly CLEANUP_INTERVAL = 10 * 60; // 10 minutes

  static generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static getSessionKey(sessionId: string): string {
    return `${this.SESSION_PREFIX}${sessionId}`;
  }

  static async createSession(
    email: string, 
    options: {
      interviewId?: string;
      interviewType?: string;
      candidateLocation?: string;
      candidateIP?: string;
      userAgent?: string;
      metadata?: any;
    } = {}
  ): Promise<string> {
    try {
      const redis = await getRedisClient();
      const sessionId = this.generateSessionId();
      const now = Date.now();
      
      const session: InterviewSession = {
        id: sessionId,
        email,
        interviewId: options.interviewId,
        interviewType: options.interviewType,
        purpose: 'interview_access',
        verified: true,
        createdAt: now,
        lastActivity: now,
        expiresAt: now + (this.SESSION_TIMEOUT * 1000),
        candidateLocation: options.candidateLocation,
        candidateIP: options.candidateIP,
        userAgent: options.userAgent,
        metadata: options.metadata,
      };

      const key = this.getSessionKey(sessionId);
      await redis.setex(key, this.SESSION_TIMEOUT, JSON.stringify(session));
      
      console.log(`✅ Created Redis session: ${sessionId} for ${email}`);
      return sessionId;
    } catch (error) {
      console.error('Error creating Redis session:', error);
      throw new Error('Failed to create session');
    }
  }

  static async getSession(sessionId: string): Promise<InterviewSession | null> {
    try {
      const redis = await getRedisClient();
      const key = this.getSessionKey(sessionId);
      const sessionData = await redis.get(key);
      
      if (!sessionData) {
        return null;
      }

      const session: InterviewSession = JSON.parse(sessionData);
      
      // Check if session has expired
      if (Date.now() > session.expiresAt) {
        await this.deleteSession(sessionId);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error getting Redis session:', error);
      return null;
    }
  }

  static async updateSession(sessionId: string, updates: Partial<InterviewSession>): Promise<boolean> {
    try {
      const redis = await getRedisClient();
      const key = this.getSessionKey(sessionId);
      const sessionData = await redis.get(key);
      
      if (!sessionData) {
        return false;
      }

      const session: InterviewSession = JSON.parse(sessionData);
      const updatedSession = {
        ...session,
        ...updates,
        lastActivity: Date.now(),
      };

      await redis.setex(key, this.SESSION_TIMEOUT, JSON.stringify(updatedSession));
      return true;
    } catch (error) {
      console.error('Error updating Redis session:', error);
      return false;
    }
  }

  static async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const redis = await getRedisClient();
      const key = this.getSessionKey(sessionId);
      const result = await redis.del(key);
      return result > 0;
    } catch (error) {
      console.error('Error deleting Redis session:', error);
      return false;
    }
  }

  static async refreshSession(sessionId: string): Promise<boolean> {
    try {
      const redis = await getRedisClient();
      const key = this.getSessionKey(sessionId);
      const sessionData = await redis.get(key);
      
      if (!sessionData) {
        return false;
      }

      const session: InterviewSession = JSON.parse(sessionData);
      session.lastActivity = Date.now();
      session.expiresAt = Date.now() + (this.SESSION_TIMEOUT * 1000);

      await redis.setex(key, this.SESSION_TIMEOUT, JSON.stringify(session));
      return true;
    } catch (error) {
      console.error('Error refreshing Redis session:', error);
      return false;
    }
  }

  static async getUserSessions(email: string): Promise<InterviewSession[]> {
    try {
      const redis = await getRedisClient();
      const pattern = `${this.SESSION_PREFIX}*`;
      const keys = await redis.keys(pattern);
      const sessions: InterviewSession[] = [];

      for (const key of keys) {
        try {
          const sessionData = await redis.get(key);
          if (sessionData) {
            const session: InterviewSession = JSON.parse(sessionData);
            if (session.email === email && Date.now() < session.expiresAt) {
              sessions.push(session);
            }
          }
        } catch (error) {
          console.error(`Error parsing session data for key ${key}:`, error);
        }
      }

      return sessions;
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }

  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const redis = await getRedisClient();
      const pattern = `${this.SESSION_PREFIX}*`;
      const keys = await redis.keys(pattern);
      let cleaned = 0;

      for (const key of keys) {
        try {
          const sessionData = await redis.get(key);
          if (sessionData) {
            const session: InterviewSession = JSON.parse(sessionData);
            if (Date.now() > session.expiresAt) {
              await redis.del(key);
              cleaned++;
            }
          }
        } catch (error) {
          // If we can't parse the session, delete it
          await redis.del(key);
          cleaned++;
        }
      }

      console.log(`🧹 Cleaned up ${cleaned} expired sessions`);
      return cleaned;
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
      return 0;
    }
  }

  static async getAllActiveSessions(): Promise<{ count: number; sessions: InterviewSession[] }> {
    try {
      const redis = await getRedisClient();
      const pattern = `${this.SESSION_PREFIX}*`;
      const keys = await redis.keys(pattern);
      const sessions: InterviewSession[] = [];

      for (const key of keys) {
        try {
          const sessionData = await redis.get(key);
          if (sessionData) {
            const session: InterviewSession = JSON.parse(sessionData);
            if (Date.now() < session.expiresAt) {
              sessions.push(session);
            }
          }
        } catch (error) {
          console.error(`Error parsing session data for key ${key}:`, error);
        }
      }

      return { count: sessions.length, sessions };
    } catch (error) {
      console.error('Error getting all active sessions:', error);
      return { count: 0, sessions: [] };
    }
  }
}

// Utility functions for middleware and API routes
export async function verifyInterviewSession(request: NextRequest): Promise<InterviewSession | null> {
  try {
    const sessionId = request.cookies.get('interview-session-id')?.value;
    
    if (!sessionId) {
      return null;
    }

    const session = await RedisSessionManager.getSession(sessionId);
    
    if (!session || !session.verified) {
      return null;
    }

    // Refresh session on activity
    await RedisSessionManager.refreshSession(sessionId);
    
    return session;
  } catch (error) {
    console.error('Interview session verification error:', error);
    return null;
  }
}

export function setSessionCookie(response: NextResponse, sessionId: string): void {
  response.cookies.set('interview-session-id', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: RedisSessionManager['SESSION_TIMEOUT'],
    path: '/',
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set('interview-session-id', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

export async function extractEmailFromSession(request: NextRequest): Promise<string | null> {
  const session = await verifyInterviewSession(request);
  return session?.email || null;
}

export async function getClientIP(request: NextRequest): Promise<string> {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = request.headers.get('x-client-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (clientIP) {
    return clientIP;
  }
  
  return 'unknown';
}

export async function getLocationFromIP(ip: string): Promise<string | null> {
  // In production, you would use a geolocation service like:
  // - MaxMind GeoIP2
  // - ipapi.co
  // - ip-api.com
  
  try {
    if (ip === 'unknown' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return 'Local/Private Network';
    }
    
    // For now, return null. Implement actual geolocation service in production
    return null;
  } catch (error) {
    console.error('Error getting location from IP:', error);
    return null;
  }
}