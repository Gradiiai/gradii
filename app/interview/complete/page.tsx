'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/shared/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
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
  answeredQuestions: number;
  score: number;
  maxScore: number;
  passed: boolean;
  programmingLanguage?: string;
  candidateName: string;
  candidateEmail: string;
  status: string;
}

function InterviewCompleteContent() {
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

        // Build API URL for completed interview data
        const response = await fetch(
          `/api/interview/complete/${interviewId}`
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
                  <span className="font-medium">
                    {interview.answeredQuestions || interview.totalQuestions} of {interview.totalQuestions}
                  </span>
                </div>
              )}
              {interview?.score !== undefined && interview?.maxScore !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Score</span>
                  <span className="font-medium">
                    {interview.score} / {interview.maxScore}
                    {interview.maxScore > 0 && (
                      <span className="text-sm text-gray-500 ml-1">
                        ({Math.round((interview.score / interview.maxScore) * 100)}%)
                      </span>
                    )}
                  </span>
                </div>
              )}
              {interview?.programmingLanguage && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Programming Language</span>
                  <span className="font-medium">{interview.programmingLanguage}</span>
                </div>
              )}
              {interview?.passed !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`font-medium ${interview.passed ? 'text-green-600' : 'text-yellow-600'}`}>
                    {interview.passed ? 'Passed' : 'Under Review'}
                  </span>
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
        <div className="flex justify-center">
          <Button
            onClick={() => router.push('/jobs')}
            className="flex items-center justify-center px-8 py-3"
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

export default function InterviewComplete() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    }>
      <InterviewCompleteContent />
    </Suspense>
  );
}