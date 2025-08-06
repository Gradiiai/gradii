'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/shared/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  Home,
  Briefcase,
  Calendar as CalendarIcon,
  Loader2,
  Clock,
  Target,
  Award,
} from 'lucide-react';
import { format } from 'date-fns';

interface Interview {
  id: string;
  title: string;
  companyName: string;
  jobTitle: string;
  completedAt: string;
  actualDuration: number;
  interviewType: string;
  timeSpent: number;
  totalQuestions: number;
}

export default function InterviewComplete() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const interviewId = searchParams.get('interviewId');

  useEffect(() => {
    const fetchInterview = async () => {
      try {
        setLoading(true);

        if (!interviewId) {
          throw new Error('Missing interview ID parameter');
        }

        // Build API URL
        const response = await fetch(
          `/api/interview/${interviewId}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch interview details');
        }

        const data = await response.json();
        setInterview(data.data || data);
      } catch (err) {
        console.error('Error fetching interview:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load interview details'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInterview();
  }, [interviewId]);

  const getInterviewTypeLabel = (type: string) => {
    switch (type) {
      case 'coding':
        return 'Coding Interview';
      case 'mcq':
        return 'Multiple Choice';
      case 'behavioral':
        return 'Behavioral Interview';
      case 'combo':
        return 'Combined Interview';
      default:
        return 'Interview';
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Alert className="max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Interview Completed!
          </h1>
          <p className="text-gray-600">
            Thank you for completing your interview. We'll be in touch soon.
          </p>
        </div>

        {/* Interview Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Interview Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Position</span>
                <span className="font-medium">{interview?.jobTitle}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Company</span>
                <span className="font-medium">{interview?.companyName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Interview Type</span>
                <span className="font-medium">
                  {getInterviewTypeLabel(interview?.interviewType || '')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Completed At</span>
                <span className="font-medium">
                  {interview?.completedAt 
                    ? format(new Date(interview.completedAt), 'PPp')
                    : format(new Date(), 'PPp')
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Duration</span>
                <span className="font-medium">
                  {formatDuration(interview?.timeSpent || interview?.actualDuration || 0)}
                </span>
              </div>
              {interview?.totalQuestions && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Questions Answered</span>
                  <span className="font-medium">{interview.totalQuestions}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2" />
              What's Next?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-gray-600">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <p>
                  Our team will review your responses and get back to you within 3-5 business days.
                </p>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <p>
                  You'll receive an email notification with the results and next steps.
                </p>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <p>
                  If you have any questions, feel free to reach out to our HR team.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => router.push('/candidate')}
            className="flex items-center justify-center flex-1"
          >
            <Home className="h-4 w-4 mr-2" />
            Return to Dashboard
          </Button>
          <Button
            onClick={() => router.push('/jobs')}
            variant="outline"
            className="flex items-center justify-center flex-1"
          >
            <Briefcase className="h-4 w-4 mr-2" />
            Browse More Jobs
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>
            Interview ID: {interview?.id || interviewId}
          </p>
        </div>
      </div>
    </div>
  );
}