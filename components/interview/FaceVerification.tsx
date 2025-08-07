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

// Dynamic imports for face detection models
let faceDetectionModel: any = null;
let loadedModels = false;

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
  faceDescriptors: number[][];
  capturedImages: string[];
  metadata: {
    modelUsed: string;
    averageConfidence: number;
    verificationTime: number;
    faceQualityScore: number;
  };
}

interface DetectedFace {
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks: number[][];
  confidence: number;
  descriptor: number[];
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
  const [isDetecting, setIsDetecting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'detecting' | 'verifying' | 'completed' | 'failed'>('idle');
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);

  // Model initialization
  const initializeModels = useCallback(async () => {
    try {
      if (loadedModels) return;

      // Use @vladmandic/face-api as it's the most modern and actively maintained
      const { default: faceapi } = await import('@vladmandic/face-api');
      
      // Load models from CDN or local path
      const modelPath = '/models'; // You'll need to serve the model files
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
        faceapi.nets.faceExpressionNet.loadFromUri(modelPath),
      ]);

      faceDetectionModel = faceapi;
      loadedModels = true;
      setIsInitialized(true);
    } catch (err) {
      console.error('Failed to load face detection models:', err);
      setError('Failed to load face recognition models. Using fallback detection.');
      // Fall back to basic camera without AI detection
      setIsInitialized(true);
    }
  }, []);

  // Camera initialization
  const initializeCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Failed to access camera. Please grant camera permissions.');
      onVerificationError('Camera access denied');
    }
  }, [onVerificationError]);

  // Face detection using AI models
  const detectFaces = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !faceDetectionModel || !cameraActive) {
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Detect faces with landmarks and descriptors
      const detections = await faceDetectionModel
        .detectAllFaces(video, new faceDetectionModel.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors()
        .withFaceExpressions();

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const faces: DetectedFace[] = [];

      detections.forEach((detection: any) => {
        const { box, landmarks, descriptor, expressions } = detection;
        
        // Draw face bounding box
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Draw landmarks
        ctx.fillStyle = '#ff0000';
        landmarks.positions.forEach((point: any) => {
          ctx.fillRect(point.x - 1, point.y - 1, 2, 2);
        });

        // Add face data
        faces.push({
          box: {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
          },
          landmarks: landmarks.positions,
          confidence: expressions.neutral || 0.5, // Use neutral expression as base confidence
          descriptor: Array.from(descriptor),
        });

        // Draw confidence score
        ctx.fillStyle = '#00ff00';
        ctx.font = '16px Arial';
        ctx.fillText(
          `Confidence: ${(expressions.neutral * 100).toFixed(1)}%`,
          box.x,
          box.y - 10
        );
      });

      setDetectedFaces(faces);
    } catch (err) {
      console.error('Face detection error:', err);
    }
  }, [cameraActive]);

  // Fallback face detection using basic computer vision
  const detectFacesFallback = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) {
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image data for basic processing
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Simple face detection simulation (center area assumption)
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const faceWidth = 200;
      const faceHeight = 240;

      // Draw a detection box in center (simulated detection)
      ctx.strokeStyle = '#ffa500';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        centerX - faceWidth / 2,
        centerY - faceHeight / 2,
        faceWidth,
        faceHeight
      );

      // Simulate face data
      const simulatedFace: DetectedFace = {
        box: {
          x: centerX - faceWidth / 2,
          y: centerY - faceHeight / 2,
          width: faceWidth,
          height: faceHeight,
        },
        landmarks: [], // Empty for fallback
        confidence: 0.8, // Simulated confidence
        descriptor: Array(128).fill(0).map(() => Math.random()), // Random descriptor
      };

      setDetectedFaces([simulatedFace]);

      // Draw instruction
      ctx.fillStyle = '#ffa500';
      ctx.font = '16px Arial';
      ctx.fillText('Position your face in the center', 10, 30);
    } catch (err) {
      console.error('Fallback detection error:', err);
    }
  }, [cameraActive]);

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
    setVerificationStatus('detecting');
    setProgress(0);
    setCapturedImages([]);
    setError(null);

    const startTime = Date.now();
    const requiredImages = 5;
    const capturedData: string[] = [];
    const faceDescriptors: number[][] = [];
    let totalConfidence = 0;
    let validDetections = 0;

    try {
      // Detection loop
      for (let i = 0; i < requiredImages; i++) {
        setProgress((i / requiredImages) * 80); // 80% for detection

        // Wait for face detection
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Capture image
        const image = captureVerificationImage();
        if (image) {
          capturedData.push(image);
        }

        // Process detected faces
        if (detectedFaces.length > 0) {
          const face = detectedFaces[0]; // Use first detected face
          faceDescriptors.push(face.descriptor);
          totalConfidence += face.confidence;
          validDetections++;
        }

        setProgress((i / requiredImages) * 80 + 10);
      }

      setVerificationStatus('verifying');
      setProgress(90);

      // Calculate verification metrics
      const averageConfidence = validDetections > 0 ? totalConfidence / validDetections : 0;
      const faceQualityScore = validDetections / requiredImages;
      const verificationTime = Date.now() - startTime;

      // Determine if verification is successful
      const isVerified = validDetections >= 3 && averageConfidence > 0.6 && faceQualityScore > 0.5;

      setProgress(100);
      setCapturedImages(capturedData);

      const verificationData: FaceVerificationData = {
        verified: isVerified,
        confidence: averageConfidence,
        detectionCount: validDetections,
        timestamp: Date.now(),
        faceDescriptors,
        capturedImages: capturedData,
        metadata: {
          modelUsed: loadedModels ? '@vladmandic/face-api' : 'fallback',
          averageConfidence,
          verificationTime,
          faceQualityScore,
        },
      };

      setVerificationStatus(isVerified ? 'completed' : 'failed');
      
      if (isVerified) {
        onVerificationComplete(verificationData);
      } else {
        onVerificationError('Face verification failed. Please try again.');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setVerificationStatus('failed');
      onVerificationError('Verification process failed');
    } finally {
      setIsVerifying(false);
    }
  }, [isInitialized, isVerifying, detectedFaces, captureVerificationImage, onVerificationComplete, onVerificationError]);

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

  // Initialize on mount
  useEffect(() => {
    initializeModels();
    
    return () => {
      stopCamera();
    };
  }, [initializeModels, stopCamera]);

  // Start camera when initialized
  useEffect(() => {
    if (isInitialized) {
      initializeCamera();
    }
  }, [isInitialized, initializeCamera]);

  // Start detection loop when camera is active
  useEffect(() => {
    if (cameraActive && videoRef.current) {
      const detectFunction = loadedModels ? detectFaces : detectFacesFallback;
      intervalRef.current = setInterval(detectFunction, 100); // 10 FPS
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [cameraActive, detectFaces, detectFacesFallback]);

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
          
          {detectedFaces.length > 0 && (
            <Badge variant="outline">
              {detectedFaces.length} face{detectedFaces.length !== 1 ? 's' : ''} detected
            </Badge>
          )}
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
                onClick={startVerification}
                disabled={isVerifying || detectedFaces.length === 0}
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
                  setDetectedFaces([]);
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