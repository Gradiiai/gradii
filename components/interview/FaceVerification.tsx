'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/shared/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/shared/badge';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  User,
  Shield,
  Loader2
} from 'lucide-react';

interface FaceVerificationProps {
  onVerificationComplete: (verificationData: FaceVerificationData) => void;
  onVerificationError: (error: string) => void;
  isRequired?: boolean;
  candidateEmail?: string;
}

export interface FaceVerificationData {
  verified: boolean;
  confidence: number;
  detectionCount: number;
  timestamp: number;
  capturedImages: string[];
  metadata: {
    modelUsed: string;
    averageConfidence: number;
    verificationTime: number;
    faceQualityScore: number;
  };
}

export const FaceVerification: React.FC<FaceVerificationProps> = ({
  onVerificationComplete,
  onVerificationError,
  isRequired = true,
  candidateEmail = 'candidate',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout>();
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'detecting' | 'verifying' | 'completed' | 'failed'>('idle');
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);

  // Camera initialization
  const initializeCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        setError(null);
        setIsInitialized(true);
      }
    } catch (err) {
      console.error('Camera initialization failed:', err);
      setError('Failed to access camera. Please ensure camera permissions are granted.');
      onVerificationError('Camera access denied');
    }
  }, [onVerificationError]);

  // Simple face capture without AI detection
  const captureImage = useCallback((): string => {
    if (!videoRef.current || !canvasRef.current) return '';

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Return base64 image data
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  // Simple dummy verification process
  const performVerification = useCallback(async () => {
    if (!videoRef.current || !cameraActive) {
      return;
    }

    setIsVerifying(true);
    setVerificationStatus('verifying');
    setProgress(0);

    try {
      // Simulate verification process with progress
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Capture a few images during verification
      const images: string[] = [];
      for (let i = 0; i < 3; i++) {
        const image = captureImage();
        if (image) {
          images.push(image);
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setCapturedImages(images);

      // Create dummy verification data
      const verificationData: FaceVerificationData = {
        verified: true,
        confidence: 0.95,
        detectionCount: 3,
        timestamp: Date.now(),
        capturedImages: images,
        metadata: {
          modelUsed: 'dummy-camera-capture',
          averageConfidence: 0.95,
          verificationTime: 3000,
          faceQualityScore: 0.9
        }
      };

      setVerificationStatus('completed');
      onVerificationComplete(verificationData);

    } catch (error) {
      console.error('Verification error:', error);
      setVerificationStatus('failed');
      setError('Verification failed. Please try again.');
      onVerificationError('Verification process failed');
    } finally {
      setIsVerifying(false);
    }
  }, [cameraActive, captureImage, onVerificationComplete, onVerificationError]);

  // Capture verification images
  const captureVerificationImage = useCallback(() => {
    if (!canvasRef.current) return null;

    const canvas = canvasRef.current;
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  // Start verification process
  const startVerification = useCallback(async () => {
    if (!isInitialized || isVerifying) return;

    setIsVerifying(true);
    setVerificationStatus('verifying');
    setProgress(0);
    setCapturedImages([]);
    setError(null);

    try {
      // Simulate verification process with progress
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Capture a few images during verification
      const images: string[] = [];
      for (let i = 0; i < 3; i++) {
        const image = captureImage();
        if (image) {
          images.push(image);
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setCapturedImages(images);

      // Create dummy verification data
      const verificationData: FaceVerificationData = {
        verified: true,
        confidence: 0.95,
        detectionCount: 3,
        timestamp: Date.now(),
        capturedImages: images,
        metadata: {
          modelUsed: 'dummy-camera-capture',
          averageConfidence: 0.95,
          verificationTime: 3000,
          faceQualityScore: 0.9
        }
      };

      setVerificationStatus('completed');
      onVerificationComplete(verificationData);

    } catch (error) {
      console.error('Verification error:', error);
      setVerificationStatus('failed');
      setError('Verification failed. Please try again.');
      onVerificationError('Verification process failed');
    } finally {
      setIsVerifying(false);
    }
  }, [isInitialized, isVerifying, captureImage, onVerificationComplete, onVerificationError]);

  // Stop verification
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setCameraActive(false);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  // Initialize camera on component mount
  useEffect(() => {
    initializeCamera();

    return () => {
      stopCamera();
    };
  }, [initializeCamera, stopCamera]);

  const getStatusColor = () => {
    switch (verificationStatus) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'detecting':
      case 'verifying': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'failed': return <AlertTriangle className="h-4 w-4" />;
      case 'detecting':
      case 'verifying': return <Loader2 className="h-4 w-4 animate-spin" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Face Verification
          {isRequired && <Badge variant="destructive">Required</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <Badge className={getStatusColor()}>
            {getStatusIcon()}
            <span className="ml-2">
              {verificationStatus === 'idle' && 'Ready to verify'}
              {verificationStatus === 'detecting' && 'Detecting face...'}
              {verificationStatus === 'verifying' && 'Processing verification...'}
              {verificationStatus === 'completed' && 'Verification completed'}
              {verificationStatus === 'failed' && 'Verification failed'}
            </span>
          </Badge>
          

        </div>

        {/* Progress bar */}
        {isVerifying && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Video feed */}
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-64 object-cover"
            style={{ display: cameraActive ? 'block' : 'none' }}
          />
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="absolute top-0 left-0 w-full h-full object-cover"
          />
          
          {!cameraActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <div className="text-center text-white">
                <CameraOff className="h-12 w-12 mx-auto mb-2" />
                <p>Camera not active</p>
              </div>
            </div>
          )}
        </div>

        {/* Error display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          {!cameraActive ? (
            <Button 
              onClick={initializeCamera}
              disabled={!isInitialized}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              {isInitialized ? 'Start Camera' : 'Initializing...'}
            </Button>
          ) : (
            <>
              <Button
                onClick={performVerification}
                disabled={isVerifying || !cameraActive}
                className="flex-1"
              >
                {isVerifying ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                {isVerifying ? 'Verifying...' : 'Start Verification'}
              </Button>
              
              <Button
                variant="outline"
                onClick={stopCamera}
              >
                <CameraOff className="h-4 w-4 mr-2" />
                Stop
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  setError(null);
                  setVerificationStatus('idle');
                  setProgress(0);
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </>
          )}
        </div>

        {/* Instructions */}
        <div className="text-sm text-gray-600 space-y-1">
          <p>• Position your face in the center of the video frame</p>
          <p>• Ensure good lighting and look directly at the camera</p>
          <p>• Keep your face visible throughout the verification process</p>
          {!isRequired && <p>• Face verification is optional for this interview</p>}
        </div>

        {/* Captured images preview */}
        {capturedImages.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Captured verification images:</h4>
            <div className="flex gap-2 overflow-x-auto">
              {capturedImages.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`Verification ${index + 1}`}
                  className="w-16 h-16 rounded border object-cover flex-shrink-0"
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FaceVerification;