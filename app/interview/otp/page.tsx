'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/shared/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Input } from '@/components/ui/shared/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ArrowRight, Loader2, RefreshCw } from 'lucide-react';

function OTPVerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  const email = searchParams.get('email');
  const interviewId = searchParams.get('interviewId');
  const interviewType = searchParams.get('type');

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otp) {
      setError('Please enter the OTP code');
      return;
    }

    if (!email) {
      setError('Email not found. Please go back and enter your email.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/interview/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify({ email, otp })});

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Invalid OTP code');
      }

      const data = await response.json();
      
      if (data.success) {
        // Redirect to interview lobby with parameters
        const lobbyUrl = `/interview/lobby?email=${encodeURIComponent(email)}${interviewId ? `&interviewId=${interviewId}` : ''}${interviewType ? `&type=${interviewType}` : ''}`;
        router.push(lobbyUrl);
      } else {
        throw new Error(data.error || 'OTP verification failed');
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      setError(err instanceof Error ? err.message : 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!email) {
      setError('Email not found. Please go back and enter your email.');
      return;
    }

    setResending(true);
    setError(null);

    try {
      const response = await fetch('/api/interview/resend-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to resend OTP');
      }

      const data = await response.json();
      
      if (data.success) {
        setTimeLeft(300); // Reset timer
        setOtp(''); // Clear current OTP
        setError(null);
        setSuccess('New verification code sent successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(data.error || 'Failed to resend OTP');
      }
    } catch (err) {
      console.error('Resend OTP error:', err);
      setError(err instanceof Error ? err.message : 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Enter Verification Code
          </CardTitle>
          <p className="text-gray-600 mt-2">
            We've sent a verification code to {email}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <Input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                className="w-full text-center text-2xl tracking-widest"
                disabled={loading}
                maxLength={6}
                required
              />
            </div>

            {timeLeft > 0 && (
              <p className="text-sm text-gray-500 text-center">
                Code expires in {formatTime(timeLeft)}
              </p>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full flex items-center justify-center"
              disabled={loading || !otp || otp.length !== 6}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 mb-2">
              Didn't receive the code?
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResendOTP}
              disabled={resending || timeLeft > 240} // Allow resend after 1 minute
              className="flex items-center"
            >
              {resending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {resending ? 'Sending...' : 'Resend Code'}
            </Button>
          </div>

          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/interview/verify')}
              className="text-blue-600 hover:text-blue-700"
            >
              ← Back to email verification
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OTPVerificationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading verification...</p>
        </div>
      </div>
    }>
      <OTPVerificationContent />
    </Suspense>
  );
}