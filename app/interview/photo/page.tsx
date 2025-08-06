"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shared/card";
import { Button } from "@/components/ui/shared/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Camera,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";

function PhotoCaptureContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  const email = searchParams.get('email');
  const interviewId = searchParams.get('interviewId');
  const interviewType = searchParams.get('type');

  useEffect(() => {
    initializeCamera();
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const initializeCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setIsCameraReady(true);
        };
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setCameraError('Unable to access camera. Please check permissions and try again.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsCapturing(true);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const photoUrl = URL.createObjectURL(blob);
        setCapturedPhoto(photoUrl);
        setIsCapturing(false);
      }
    }, 'image/jpeg', 0.8);
  };

  const retakePhoto = () => {
    if (capturedPhoto) {
      URL.revokeObjectURL(capturedPhoto);
      setCapturedPhoto(null);
    }
  };

  const uploadPhotoAndProceed = async () => {
    if (!capturedPhoto || !canvasRef.current) return;
    
    setIsUploading(true);
    
    try {
      // Convert canvas to blob
      const canvas = canvasRef.current;
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });
      
      if (!blob) {
        throw new Error('Failed to process photo');
      }
      
      // Create form data
      const formData = new FormData();
      formData.append('photo', blob, 'verification_photo.jpg');
      formData.append('email', email || '');
      formData.append('interviewId', interviewId || '');
      
      // Upload photo
      const response = await fetch('/api/interview/upload-photo', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload verification photo');
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Photo captured successfully",
          description: "Your verification photo has been saved securely.",
        });
        
        // Proceed to OTP verification
        const otpUrl = `/interview/otp?email=${encodeURIComponent(email || '')}&interviewId=${interviewId}&type=${interviewType}`;
        router.push(otpUrl);
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleBack = () => {
    const detailsUrl = `/interview/details?email=${encodeURIComponent(email || '')}&interviewId=${interviewId}&type=${interviewType}`;
    router.push(detailsUrl);
  };

  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Identity Verification
          </h1>
          <p className="text-gray-600">
            Please take a clear photo of yourself for identity verification
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Camera className="w-5 h-5 mr-2" />
              Verification Photo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cameraError ? (
              <Alert className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {cameraError}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={initializeCamera}
                    className="ml-2"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Camera/Photo Display */}
                <div className="relative mb-6">
                  <div className="aspect-[4/3] bg-black rounded-lg overflow-hidden relative">
                    {!capturedPhoto ? (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className={`w-full h-full object-cover ${showPreview ? '' : 'invisible'}`}
                        />
                        {!showPreview && (
                          <div className="absolute inset-0 bg-black flex items-center justify-center">
                            <p className="text-white text-lg">Camera preview hidden</p>
                          </div>
                        )}
                        {!isCameraReady && (
                          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                            <div className="text-center text-white">
                              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                              <p>Initializing camera...</p>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <img
                        src={capturedPhoto}
                        alt="Captured verification photo"
                        className="w-full h-full object-cover"
                      />
                    )}
                    
                    {/* Privacy toggle */}
                    {!capturedPhoto && isCameraReady && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={togglePreview}
                        className="absolute top-2 right-2"
                      >
                        {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                  
                  {/* Photo guidelines overlay */}
                  {!capturedPhoto && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="w-full h-full border-2 border-dashed border-white/50 rounded-lg flex items-center justify-center">
                        <div className="w-48 h-48 border-2 border-white/80 rounded-full"></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Photo Guidelines */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Photo Guidelines</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Ensure your face is clearly visible and well-lit</li>
                    <li>• Look directly at the camera</li>
                    <li>• Remove sunglasses or hats if wearing any</li>
                    <li>• Use a plain background if possible</li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="flex items-center"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>

                  <div className="flex space-x-3">
                    {capturedPhoto ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={retakePhoto}
                          disabled={isUploading}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Retake
                        </Button>
                        <Button
                          onClick={uploadPhotoAndProceed}
                          disabled={isUploading}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isUploading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          {isUploading ? 'Uploading...' : 'Confirm & Continue'}
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={capturePhoto}
                        disabled={!isCameraReady || isCapturing}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        {isCapturing ? 'Capturing...' : 'Take Photo'}
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Hidden canvas for photo processing */}
        <canvas
          ref={canvasRef}
          className="hidden"
        />

        {/* Privacy Notice */}
        <div className="mt-6">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Privacy Notice:</strong> This verification photo is used solely for identity 
              verification purposes and will be stored securely. You can toggle the camera preview 
              off for privacy while positioning yourself.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}

export default function PhotoCapturePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading photo capture...</p>
        </div>
      </div>
    }>
      <PhotoCaptureContent />
    </Suspense>
  );
}