'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Button } from '@/components/ui/shared/button';
import { Badge } from '@/components/ui/shared/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle2,
  Clock,
  Video,
  Mic,
  Camera,
  AlertTriangle,
  ArrowRight,
  Building2,
  User,
  Play,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';

interface Interview {
  id: string;
  title: string;
  type: 'behavioral' | 'mcq' | 'coding' | 'combo';
  companyName: string;
  jobTitle: string;
  duration: number;
  scheduledAt: Date;
  status: string;
  instructions?: string;
}

function InterviewLobbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mediaPermissions, setMediaPermissions] = useState({
    camera: false,
    microphone: false,
  });
  const [testingMedia, setTestingMedia] = useState(false);

  const interviewId = searchParams.get('interviewId');
  const interviewType = searchParams.get('type');

  useEffect(() => {
    const loadInterview = async () => {
      try {
        if (!interviewId) {
          throw new Error('Missing interview ID');
        }

        const response = await fetch(
          `/api/interview/${interviewId}`
        );

        if (!response.ok) {
          throw new Error('Failed to load interview');
        }

        const data = await response.json();
        setInterview({
          id: data.interview.id,
          title: data.interview.title,
          type: interviewType || data.interview.type,
          companyName: data.interview.companyName || 'Company',
          jobTitle: data.interview.jobTitle || 'Position',
          duration: data.interview.duration,
          scheduledAt: new Date(data.interview.scheduledAt || new Date()),
          status: data.interview.status,
          instructions: data.interview.instructions,
        });
      } catch (err) {
        console.error('Error loading interview:', err);
        setError(err instanceof Error ? err.message : 'Failed to load interview');
      } finally {
        setLoading(false);
      }
    };

    loadInterview();
  }, [interviewId]);

  const testMediaDevices = async () => {
    setTestingMedia(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setMediaPermissions({
        camera: true,
        microphone: true,
      });

      // Stop the stream after testing
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error('Media permission error:', err);
      setMediaPermissions({
        camera: false,
        microphone: false,
      });
    } finally {
      setTestingMedia(false);
    }
  };

  const startInterview = () => {
    if (!interview) return;

    const queryString = `?interviewId=${interviewId}`;
    
    switch (interview.type) {
      case 'coding':
        router.push(`/interview/types/coding${queryString}`);
        break;
      case 'mcq':
        router.push(`/interview/types/mcq${queryString}`);
        break;
      case 'behavioral':
        router.push(`/interview/types/behavioral${queryString}`);
        break;
      case 'combo':
        router.push(`/interview/types/combo${queryString}`);
        break;
      default:
        router.push(`/interview/types/behavioral${queryString}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading interview lobby...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const getInterviewTypeInfo = (type: string) => {
    switch (type) {
      case 'coding':
        return {
          name: 'Coding Interview',
          description: 'Technical coding challenges and problem-solving',
          icon: '💻',
          color: 'bg-purple-100 text-purple-800',
        };
      case 'mcq':
        return {
          name: 'Multiple Choice',
          description: 'Knowledge-based multiple choice questions',
          icon: '📝',
          color: 'bg-blue-100 text-blue-800',
        };
      case 'behavioral':
        return {
          name: 'Behavioral Interview',
          description: 'Experience and situation-based questions',
          icon: '🗣️',
          color: 'bg-green-100 text-green-800',
        };
      case 'combo':
        return {
          name: 'Combined Interview',
          description: 'Mix of technical and behavioral questions',
          icon: '🎯',
          color: 'bg-orange-100 text-orange-800',
        };
      default:
        return {
          name: 'Interview',
          description: 'Standard interview format',
          icon: '📋',
          color: 'bg-gray-100 text-gray-800',
        };
    }
  };

  const typeInfo = getInterviewTypeInfo(interview?.type || '');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Interview Lobby</h1>
          <p className="text-gray-600">Please check your setup before starting</p>
        </div>

        {/* Interview Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Interview Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">{interview?.title}</h3>
                <p className="text-gray-600 mb-4">{interview?.companyName} - {interview?.jobTitle}</p>
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    Duration: {interview?.duration} minutes
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="h-4 w-4 mr-2" />
                    Scheduled: {interview?.scheduledAt ? format(interview.scheduledAt, 'PPp') : 'Now'}
                  </div>
                </div>
              </div>
              
              <div>
                <Badge className={typeInfo.color}>
                  {typeInfo.icon} {typeInfo.name}
                </Badge>
                <p className="text-sm text-gray-600 mt-2">{typeInfo.description}</p>
              </div>
            </div>

            {interview?.instructions && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Instructions</h4>
                <p className="text-blue-800 text-sm">{interview.instructions}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Check */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle2 className="h-5 w-5 mr-2" />
              System Check
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Media Permissions */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center">
                  <Camera className="h-5 w-5 mr-3" />
                  <div>
                    <p className="font-medium">Camera Access</p>
                    <p className="text-sm text-gray-500">Required for video recording</p>
                  </div>
                </div>
                <div className="flex items-center">
                  {mediaPermissions.camera ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center">
                  <Mic className="h-5 w-5 mr-3" />
                  <div>
                    <p className="font-medium">Microphone Access</p>
                    <p className="text-sm text-gray-500">Required for audio recording</p>
                  </div>
                </div>
                <div className="flex items-center">
                  {mediaPermissions.microphone ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  )}
                </div>
              </div>

              <Button
                onClick={testMediaDevices}
                disabled={testingMedia}
                className="w-full"
                variant="outline"
              >
                {testingMedia ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Video className="h-4 w-4 mr-2" />
                )}
                {testingMedia ? 'Testing...' : 'Test Camera & Microphone'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Ready to Start */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Play className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to Start?</h3>
              <p className="text-gray-600 mb-6">
                Make sure you have a stable internet connection and are in a quiet environment.
              </p>
              
              <Button
                onClick={startInterview}
                size="lg"
                className="flex items-center mx-auto"
                disabled={!mediaPermissions.camera || !mediaPermissions.microphone}
              >
                Start Interview
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              {(!mediaPermissions.camera || !mediaPermissions.microphone) && (
                <p className="text-sm text-red-600 mt-4">
                  Please grant camera and microphone permissions to continue
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function InterviewLobby() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading interview lobby...</p>
        </div>
      </div>
    }>
      <InterviewLobbyContent />
    </Suspense>
  );
}