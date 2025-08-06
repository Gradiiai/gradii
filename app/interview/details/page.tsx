"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shared/card";
import { Button } from "@/components/ui/shared/button";
import { Badge } from "@/components/ui/shared/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar,
  Clock,
  Building2,
  User,
  Mail,
  FileText,
  Video,
  Camera,
  CheckCircle,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Monitor,
  Mic,
  Globe,
} from "lucide-react";
import { format } from "date-fns";

interface InterviewDetails {
  id: string;
  jobTitle: string;
  companyName: string;
  companyLogo?: string;
  interviewType: "behavioral" | "coding" | "mcq" | "combo";
  scheduledDate: Date;
  duration: number;
  interviewerName: string;
  interviewerTitle: string;
  instructions?: string;
  candidateEmail: string;
  candidateName?: string;
  systemRequirements: {
    camera: boolean;
    microphone: boolean;
    browser: string[];
    stableInternet: boolean;
  };
}

const interviewTypeConfig = {
  behavioral: {
    label: "Behavioral Interview",
    description: "Discussion-based interview focusing on your experiences and behavioral competencies",
    color: "bg-blue-100 text-blue-800",
    icon: User,
  },
  coding: {
    label: "Coding Interview", 
    description: "Technical interview with programming challenges and live coding",
    color: "bg-green-100 text-green-800",
    icon: Monitor,
  },
  mcq: {
    label: "MCQ Assessment",
    description: "Multiple choice questions testing your knowledge and skills",
    color: "bg-orange-100 text-orange-800", 
    icon: CheckCircle,
  },
  combo: {
    label: "Combined Interview",
    description: "Multi-format interview combining behavioral questions and technical assessment",
    color: "bg-indigo-100 text-indigo-800",
    icon: FileText,
  },
};

function InterviewDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [interview, setInterview] = useState<InterviewDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const email = searchParams.get('email');
  const interviewId = searchParams.get('interviewId');
  const interviewType = searchParams.get('type');

  useEffect(() => {
    const loadInterviewDetails = async () => {
      try {
        if (!email || !interviewId) {
          throw new Error('Missing email or interview ID');
        }

        const response = await fetch(
          `/api/interview/${interviewId}/details?email=${encodeURIComponent(email)}`
        );

        if (!response.ok) {
          throw new Error('Failed to load interview details');
        }

        const data = await response.json();
        
        setInterview({
          id: data.interview.id,
          jobTitle: data.interview.jobTitle || data.interview.jobPosition || 'Interview',
          companyName: data.interview.companyName || 'Company',
          companyLogo: data.interview.companyLogo,
          interviewType: interviewType as any || data.interview.interviewType || 'behavioral',
          scheduledDate: new Date(data.interview.scheduledAt || data.interview.interviewDate),
          duration: data.interview.duration || data.interview.timeLimit || 60,
          interviewerName: data.interview.interviewerName || 'Interviewer',
          interviewerTitle: data.interview.interviewerTitle || 'HR Representative',
          instructions: data.interview.instructions || data.interview.jobDescription,
          candidateEmail: email,
          candidateName: data.interview.candidateName,
          systemRequirements: {
            camera: true,
            microphone: true,
            browser: ['Chrome', 'Firefox', 'Safari', 'Edge'],
            stableInternet: true,
          },
        });
      } catch (err) {
        console.error('Error loading interview details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load interview details');
      } finally {
        setLoading(false);
      }
    };

    loadInterviewDetails();
  }, [email, interviewId, interviewType]);

  const handleProceedToPhoto = () => {
    if (!interview) return;
    
    const photoUrl = `/interview/photo?email=${encodeURIComponent(interview.candidateEmail)}&interviewId=${interviewId}&type=${interview.interviewType}`;
    router.push(photoUrl);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading interview details...</p>
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

  if (!interview) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Interview details not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const typeInfo = interviewTypeConfig[interview.interviewType];
  const TypeIcon = typeInfo.icon;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Interview Details
          </h1>
          <p className="text-gray-600">
            Please review the details below before proceeding to your interview
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Interview Info */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      {interview.companyLogo ? (
                        <img
                          src={interview.companyLogo}
                          alt={interview.companyName}
                          className="w-12 h-12 rounded"
                        />
                      ) : (
                        <Building2 className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-xl">{interview.jobTitle}</CardTitle>
                      <p className="text-gray-600 font-medium">{interview.companyName}</p>
                      <Badge className={typeInfo.color}>
                        <TypeIcon className="w-3 h-3 mr-1" />
                        {typeInfo.label}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{typeInfo.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{format(interview.scheduledDate, "EEEE, MMMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>{format(interview.scheduledDate, "h:mm a")} ({interview.duration} min)</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <User className="w-4 h-4 mr-2" />
                    <span>{interview.interviewerName}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Mail className="w-4 h-4 mr-2" />
                    <span>{interview.candidateEmail}</span>
                  </div>
                </div>

                {interview.instructions && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Instructions</h4>
                    <p className="text-blue-800 text-sm">{interview.instructions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* System Requirements & Next Steps */}
          <div>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">System Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center text-green-600">
                    <Camera className="w-4 h-4 mr-2" />
                    <span className="text-sm">Camera Required</span>
                  </div>
                  <div className="flex items-center text-green-600">
                    <Mic className="w-4 h-4 mr-2" />
                    <span className="text-sm">Microphone Required</span>
                  </div>
                  <div className="flex items-center text-green-600">
                    <Globe className="w-4 h-4 mr-2" />
                    <span className="text-sm">Stable Internet</span>
                  </div>
                  <div className="flex items-center text-green-600">
                    <Monitor className="w-4 h-4 mr-2" />
                    <span className="text-sm">Modern Browser</span>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">
                    <strong>Supported:</strong> Chrome, Firefox, Safari, Edge
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                      1
                    </div>
                    <span>Take a verification photo</span>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                      2
                    </div>
                    <span>Verify your email with OTP</span>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                      3
                    </div>
                    <span>Test camera & microphone</span>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                      4
                    </div>
                    <span>Start your interview</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-8 text-center">
          <Button 
            onClick={handleProceedToPhoto}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
          >
            Continue to Verification
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

        {/* Important Notes */}
        <div className="mt-8">
          <Alert>
            <Video className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> This interview will be recorded for evaluation purposes. 
              Please ensure you're in a quiet, well-lit environment with a stable internet connection.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}

export default function InterviewDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading interview details...</p>
        </div>
      </div>
    }>
      <InterviewDetailsContent />
    </Suspense>
  );
}