'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/shared/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ArrowRight, Loader2, RotateCcw, Mail, Clock } from 'lucide-react';

function OTPVerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const email = searchParams.get('email');
  const interviewId = searchParams.get('interviewId');
  const interviewType = searchParams.get('type');

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/interview/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          otp: otpString,
          interviewId,
          interviewType 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify OTP');
      }

      const data = await response.json();
      
      if (data.success) {
        // Redirect to lobby with interview parameters
        const lobbyUrl = `/interview/lobby${interviewId ? `?interviewId=${interviewId}` : ''}${interviewType ? `${interviewId ? '&' : '?'}type=${interviewType}` : ''}`;
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

  const handleResendOtp = async () => {
    if (!canResend) return;

    setResendLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/interview/resend-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to resend OTP');
      }

      const data = await response.json();
      
      if (data.success) {
        setCountdown(60);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        throw new Error(data.error || 'Failed to resend OTP');
      }
    } catch (err) {
      console.error('Resend OTP error:', err);
      setError(err instanceof Error ? err.message : 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardContent className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-gray-600 mb-4">Email address is required for verification.</p>
            <Button 
              onClick={() => router.push('/interview/verify')}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              Go Back to Email Verification
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                ✓
              </div>
              <span className="ml-2 text-sm font-medium text-green-600">Email</span>
            </div>
            <div className="w-12 h-0.5 bg-blue-600"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <span className="ml-2 text-sm font-medium text-blue-600">Verify</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-200"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <span className="ml-2 text-sm text-gray-400">Start</span>
            </div>
          </div>
        </div>

        <Card className="shadow-lg border-0 bg-white">
          <CardHeader className="text-center pb-6 pt-8">
            <div className="mx-auto w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
              Verify Your Code
            </CardTitle>
            <p className="text-gray-600 text-base leading-relaxed mb-2">
              We've sent a 6-digit verification code to
            </p>
            <div className="inline-flex items-center px-3 py-1 bg-blue-50 rounded-lg">
              <Mail className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-blue-700 font-medium text-sm">{email}</span>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4 text-center">
                  Enter 6-digit verification code
                </label>
                <div className="flex justify-center space-x-3">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-0 transition-colors bg-gray-50 focus:bg-white"
                      disabled={loading}
                    />
                  ))}
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors duration-200 flex items-center justify-center"
                disabled={loading || otp.join('').length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Verifying Code...
                  </>
                ) : (
                  <>
                    Verify & Continue
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Resend section */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Didn't receive the code?
                </p>
                {canResend ? (
                  <Button
                    variant="outline"
                    onClick={handleResendOtp}
                    disabled={resendLoading}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 rounded-xl h-10"
                  >
                    {resendLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Sending New Code...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Resend Code
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="inline-flex items-center px-4 py-2 bg-gray-50 rounded-xl">
                    <Clock className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-600">
                      Resend available in <span className="font-semibold text-gray-900">{countdown}s</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Help section */}
            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-800 text-center">
                <strong>Tip:</strong> Check your spam folder if you don't see the email within a few minutes.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back button */}
        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            onClick={() => router.push('/interview/verify')}
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back to Email Verification
          </Button>
        </div>
      </div>
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