'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Button } from '@/components/ui/shared/button';
import { Badge } from '@/components/ui/shared/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import FaceVerification, { FaceVerificationData } from '@/components/interview/FaceVerification';
import { getCandidateLocationInfo, CandidateLocationInfo } from '@/lib/utils/location';
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
  Shield,
  MapPin,
  Monitor,
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
  const [faceVerified, setFaceVerified] = useState(false);
  const [faceVerificationData, setFaceVerificationData] = useState<FaceVerificationData | null>(null);
  const [locationData, setLocationData] = useState<CandidateLocationInfo | null>(null);
  const [capturingLocation, setCapturingLocation] = useState(false);

  const interviewId = searchParams.get('interviewId');
  const interviewType = searchParams.get('type');

  useEffect(() => {
    const loadInterview = async () => {
      try {
        if (!interviewId) {
          throw new Error('Missing interview ID');
        }

        const response = await fetch(
          `/api/interview/${interviewId}`,
          {
            credentials: 'include'
          }
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

    const captureLocation = async () => {
      setCapturingLocation(true);
      try {
        const location = await getCandidateLocationInfo();
        setLocationData(location);
        console.log('Location captured:', location);
      } catch (err) {
        console.error('Error capturing location:', err);
      } finally {
        setCapturingLocation(false);
      }
    };

    loadInterview();
    captureLocation();
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

  const handleFaceVerificationComplete = (data: FaceVerificationData) => {
    setFaceVerified(true);
    setFaceVerificationData(data);
    console.log('Face verification completed:', data);
  };

  const handleFaceVerificationError = (error: string) => {
    console.error('Face verification error:', error);
    setError(`Face verification failed: ${error}`);
  };

  const startInterview = async () => {
    if (!interview) return;

    // Update session with verification data before starting interview
    if (faceVerificationData || locationData) {
      try {
        await fetch('/api/interview/update-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            interviewId,
            faceVerificationData,
            locationData,
          }),
        });
      } catch (err) {
        console.error('Failed to update session with verification data:', err);
      }
    }

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
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          <div className="bg-blue-50 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Preparing Your Interview</h2>
          <p className="text-gray-600">Setting up your interview environment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          <div className="bg-red-50 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Interview</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            className="w-full"
          >
            Try Again
          </Button>
        </div>
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
    <div className="min-h-screen bg-gray-50">
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 h-2">
        <div className="bg-blue-600 h-2 w-3/4 transition-all duration-300"></div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-blue-50 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Monitor className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Interview Lobby</h1>
          <p className="text-gray-600 max-w-xl mx-auto">
            Complete the system checks below to ensure the best interview experience.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Interview Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Interview Details */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-blue-50 rounded-t-lg pb-4">
                <CardTitle className="flex items-center text-lg">
                  <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                  Interview Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{interview?.title}</h3>
                      <p className="text-gray-600">{interview?.companyName} - {interview?.jobTitle}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center p-2 bg-gray-50 rounded">
                        <Clock className="h-4 w-4 mr-2 text-blue-600" />
                        <div>
                          <p className="font-medium text-sm text-gray-900">Duration</p>
                          <p className="text-sm text-gray-600">{interview?.duration} minutes</p>
                        </div>
                      </div>
                      <div className="flex items-center p-2 bg-gray-50 rounded">
                        <User className="h-4 w-4 mr-2 text-blue-600" />
                        <div>
                          <p className="font-medium text-sm text-gray-900">Scheduled</p>
                          <p className="text-sm text-gray-600">{interview?.scheduledAt ? format(interview.scheduledAt, 'PPp') : 'Now'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="p-3 border-2 border-blue-100 rounded-lg bg-blue-50">
                      <Badge className={`${typeInfo.color} text-sm px-2 py-1 mb-2`}>
                        {typeInfo.icon} {typeInfo.name}
                      </Badge>
                      <p className="text-sm text-gray-700">{typeInfo.description}</p>
                    </div>
                  </div>
                </div>

                {interview?.instructions && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <h4 className="font-semibold text-amber-900 mb-2 flex items-center text-sm">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Important Instructions
                    </h4>
                    <p className="text-sm text-amber-800">{interview.instructions}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System Check */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-green-50 rounded-t-lg pb-4">
                <CardTitle className="flex items-center text-lg">
                  <Shield className="h-5 w-5 mr-2 text-green-600" />
                  System Check
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Media Permissions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-lg border-2 transition-all ${
                      mediaPermissions.camera 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-red-200 bg-red-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-full mr-3 ${
                            mediaPermissions.camera ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            <Camera className={`h-5 w-5 ${
                              mediaPermissions.camera ? 'text-green-600' : 'text-red-600'
                            }`} />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-gray-900">Camera</p>
                            <p className="text-xs text-gray-600">Video recording</p>
                          </div>
                        </div>
                        {mediaPermissions.camera ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                    </div>

                    <div className={`p-4 rounded-lg border-2 transition-all ${
                      mediaPermissions.microphone 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-red-200 bg-red-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-full mr-3 ${
                            mediaPermissions.microphone ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            <Mic className={`h-5 w-5 ${
                              mediaPermissions.microphone ? 'text-green-600' : 'text-red-600'
                            }`} />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-gray-900">Microphone</p>
                            <p className="text-xs text-gray-600">Audio recording</p>
                          </div>
                        </div>
                        {mediaPermissions.microphone ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={testMediaDevices}
                    disabled={testingMedia}
                    className="w-full h-12 text-base font-medium"
                    variant={mediaPermissions.camera && mediaPermissions.microphone ? "outline" : "default"}
                  >
                    {testingMedia ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Testing Devices...
                      </>
                    ) : (
                      <>
                        <Video className="h-4 w-4 mr-2" />
                        {mediaPermissions.camera && mediaPermissions.microphone 
                          ? 'Test Again' 
                          : 'Grant Camera & Microphone Access'
                        }
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Face Verification & Location */}
          <div className="space-y-6">
            {/* Face Verification */}
            <FaceVerification
              onVerificationComplete={handleFaceVerificationComplete}
              onVerificationError={handleFaceVerificationError}
              isRequired={false}
              candidateEmail={searchParams.get('email') || 'candidate'}
            />

            {/* Location Status */}
            {locationData && (
              <Card className="border-0 shadow-md">
                <CardHeader className="bg-purple-50 rounded-t-lg pb-3">
                  <CardTitle className="flex items-center text-lg">
                    <MapPin className="h-5 w-5 mr-2 text-purple-600" />
                    Location Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="font-medium text-sm text-gray-900 mb-1">IP Address</p>
                      <p className="text-xs text-gray-600">{locationData.ip.ip}</p>
                    </div>
                    {locationData.ip.city && (
                      <div className="p-3 bg-gray-50 rounded">
                        <p className="font-medium text-sm text-gray-900 mb-1">Location</p>
                        <p className="text-xs text-gray-600">{locationData.ip.city}, {locationData.ip.country}</p>
                      </div>
                    )}
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="font-medium text-sm text-gray-900 mb-1">Browser</p>
                      <p className="text-xs text-gray-600">{locationData.browser.name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ready to Start */}
            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="bg-blue-50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Play className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Ready to Begin?</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Ensure stable internet and quiet environment.
                  </p>
                  
                  {/* Status Indicators */}
                  <div className="grid grid-cols-3 gap-2 mb-6">
                    <div className={`p-2 rounded border-2 ${
                      mediaPermissions.camera && mediaPermissions.microphone 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-red-200 bg-red-50'
                    }`}>
                      <Shield className={`h-4 w-4 mx-auto mb-1 ${
                        mediaPermissions.camera && mediaPermissions.microphone 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`} />
                      <p className="text-xs font-medium">Media</p>
                    </div>
                    
                    <div className={`p-2 rounded border-2 ${
                      faceVerified 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-gray-200 bg-gray-50'
                    }`}>
                      <User className={`h-4 w-4 mx-auto mb-1 ${
                        faceVerified ? 'text-green-600' : 'text-gray-400'
                      }`} />
                      <p className="text-xs font-medium">Face</p>
                    </div>
                    
                    <div className={`p-2 rounded border-2 ${
                      locationData 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-gray-200 bg-gray-50'
                    }`}>
                      <MapPin className={`h-4 w-4 mx-auto mb-1 ${
                        locationData ? 'text-green-600' : 'text-gray-400'
                      }`} />
                      <p className="text-xs font-medium">Location</p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={startInterview}
                    size="lg"
                    className="w-full h-12 text-base font-semibold"
                    disabled={
                      !mediaPermissions.camera || 
                      !mediaPermissions.microphone ||
                      capturingLocation
                    }
                  >
                    {capturingLocation ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Preparing...
                      </>
                    ) : (
                      <>
                        Start Interview
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>

                  {(!mediaPermissions.camera || !mediaPermissions.microphone) && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-red-700 text-sm font-medium">
                        Camera and microphone access required
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InterviewLobby() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          <div className="bg-blue-50 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Interview Lobby</h2>
          <p className="text-gray-600">Please wait while we prepare your interview environment...</p>
        </div>
      </div>
    }>
      <InterviewLobbyContent />
    </Suspense>
  );
}