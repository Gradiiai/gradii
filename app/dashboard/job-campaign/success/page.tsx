"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/shared/card";
import { Button } from "@/components/ui/shared/button";
import { Badge } from "@/components/ui/shared/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Users,
  Calendar,
  Target,
  CheckCircle2,
  CircleCheck,
  InfoIcon,
  ZapIcon,
  MapPin,
  Building,
  Notebook,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { motion } from "framer-motion";
import { useJobCampaignStore } from "@/shared/store/jobCampaignStore";
import { JobCampaignNavigation } from "@/components/job-campaign/JobCampaignNavigation";

// Job Campaign Success - Portal sync functionality removed

export default function JobCampaignSuccess() {
  const router = useRouter();
  const { state, setCurrentStep } = useJobCampaignStore();
  const { jobDetails } = state;
  const [isNavigating, setIsNavigating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Simulate loading time
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleContinue = async () => {
    setIsNavigating(true);
    setCurrentStep(5);
    router.push("/dashboard/candidates");
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          {/* Navigation Skeleton */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8"
          >
            <div className="mb-6">
              <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </motion.div>

          {/* Main Card Skeleton */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
              {/* Header Skeleton */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="h-6 w-64 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="h-10 w-48 bg-gray-200 rounded animate-pulse"></div>
              </div>

              {/* Progress Skeleton */}
              <div className="flex items-center gap-4 pb-4 mb-4">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-1 w-60 bg-gray-200 rounded animate-pulse"></div>
              </div>

              {/* Cards Skeleton */}
              <div className="grid md:grid-cols-2 gap-8">
                {/* Job Summary Skeleton */}
                <div className="bg-purple-50 border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-5 h-5 bg-gray-300 rounded animate-pulse"></div>
                    <div className="h-5 w-24 bg-gray-300 rounded animate-pulse"></div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mb-1"></div>
                      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* What's Next Skeleton */}
                <div className="bg-purple-50 border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-5 h-5 bg-gray-300 rounded animate-pulse"></div>
                    <div className="h-5 w-28 bg-gray-300 rounded animate-pulse"></div>
                  </div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i}>
                        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-1"></div>
                        <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Back Button Skeleton */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <div className="h-10 w-48 bg-gray-200 rounded animate-pulse"></div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Job Campaign Navigation */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="mb-6">
            <JobCampaignNavigation />
          </div>
        </motion.div>

        {/* Main Content Container */}
        <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
          {/* Progress Bar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <CircleCheck className="h-6 w-6 text-green-600" />
                <h1 className="text-lg font-bold text-gray-900">
                  Job Campaign Created Successfully!
                </h1>
              </div>
              <Button
                onClick={handleContinue}
                disabled={isNavigating}
                className="flex items-center bg-purple-600 hover:bg-purple-700"
              >
                {isNavigating ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Loading...
                  </>
                ) : (
                  <>
                    Go to Candidates Page
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>

            {/* Step Progress */}
            <div className="flex items-center justify-between gap-4 pb-4">
              <div className="flex items-center gap-4 flex-1">
                <p className="text-gray-600 whitespace-nowrap">Step 4 of 4</p>
                <Progress
                  value={100}
                  className="h-1 w-60 [&>div]:bg-purple-600"
                />
              </div>
            </div>
          </motion.div>

          {/* Job Summary and Next Steps */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Job Summary */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card className="bg-purple-50 border border-gray-200 h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ZapIcon className="h-5 w-5 text-purple-600" />
                    Job Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <h4 className="font-semibold text-[18px] text-gray-900 mb-1">
                      {jobDetails?.jobTitle}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {jobDetails?.department}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="inline h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Location:</span>
                      </div>
                      <span className="text-sm font-medium">
                        {jobDetails?.location}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <div className="flex items-center gap-2">
                        <Building className="inline h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Experience:
                        </span>
                      </div>
                      <span className="text-sm font-medium">
                        {jobDetails?.experienceMin}-{jobDetails?.experienceMax}{" "}
                        years
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <div className="flex items-center gap-2">
                        <Notebook className="inline h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Type:</span>
                      </div>
                      <span className="text-sm font-medium">
                        {jobDetails?.employeeType}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="inline h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Openings:</span>
                      </div>
                      <span className="text-sm font-medium">
                        {jobDetails?.numberOfOpenings}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Next Steps */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card className="bg-purple-50 border border-gray-200 h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <InfoIcon className="h-5 w-5 text-purple-600" />
                    What's Next?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          Manage Candidates
                        </h4>
                        <p className="text-sm text-gray-600">
                          Review applications and manage your candidate pipeline
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          Schedule Interviews
                        </h4>
                        <p className="text-sm text-gray-600">
                          Set up interviews with qualified candidates
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          Track Progress
                        </h4>
                        <p className="text-sm text-gray-600">
                          Monitor campaign performance and analytics
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <Button
            variant="outline"
            onClick={() => {
              setCurrentStep(3);
              router.push("/dashboard/job-campaign/scoring-parameters");
            }}
            className="flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Scoring Parameters
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
