import { useToast } from "@/shared/hooks/use-toast";

export interface InterviewRecording {
  blob: Blob;
  duration: number;
  interviewId: string;
  email: string;
  interviewType: string;
  answers?: Record<string, any>;
}

export class InterviewRecordingService {
  private static instance: InterviewRecordingService;
  private toast: any;

  constructor() {
    // We'll inject toast from the component using this service
  }

  static getInstance(): InterviewRecordingService {
    if (!InterviewRecordingService.instance) {
      InterviewRecordingService.instance = new InterviewRecordingService();
    }
    return InterviewRecordingService.instance;
  }

  setToast(toast: any) {
    this.toast = toast;
  }

  /**
   * Automatically upload interview recording to Azure Blob Storage
   */
  async uploadRecording(recording: InterviewRecording): Promise<{
    success: boolean;
    recordingUrl?: string;
    error?: string;
  }> {
    try {
      // Show upload progress to user
      if (this.toast) {
        this.toast({
          title: "Uploading recording...",
          description: "Please don't close this window while uploading.",
        });
      }

      // Create form data
      const formData = new FormData();
      formData.append('recording', recording.blob, `interview_${recording.interviewId}.webm`);
      formData.append('email', recording.email);
      formData.append('interviewId', recording.interviewId);
      formData.append('interviewType', recording.interviewType);
      
      if (recording.answers) {
        formData.append('answers', JSON.stringify(recording.answers));
      }

      // Upload recording
      const response = await fetch('/api/interview/upload-recording', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload recording');
      }

      const data = await response.json();

      if (data.success) {
        if (this.toast) {
          this.toast({
            title: "Recording uploaded successfully",
            description: "Your interview has been saved and submitted.",
          });
        }

        return {
          success: true,
          recordingUrl: data.recordingUrl,
        };
      } else {
        throw new Error(data.error || 'Upload failed');
      }

    } catch (error) {
      console.error('Recording upload error:', error);
      
      if (this.toast) {
        this.toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "Failed to upload recording. Please try again.",
          variant: "destructive",
        });
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Start recording with automatic upload on completion
   */
  async startAutoRecording(
    mediaStream: MediaStream,
    options: {
      interviewId: string;
      email: string;
      interviewType: string;
      onRecordingComplete?: (url: string) => void;
      onError?: (error: string) => void;
    }
  ): Promise<{
    recorder: MediaRecorder;
    stop: () => Promise<void>;
  }> {
    const recordedChunks: Blob[] = [];
    const startTime = Date.now();

    // Initialize MediaRecorder
    const mediaRecorder = new MediaRecorder(mediaStream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
        ? 'video/webm;codecs=vp9' 
        : 'video/webm'
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      const fullVideoBlob = new Blob(recordedChunks, {
        type: 'video/webm'
      });

      console.log('Recording completed:', {
        size: fullVideoBlob.size,
        duration: duration,
        interviewId: options.interviewId
      });

      // Automatically upload the recording
      const uploadResult = await this.uploadRecording({
        blob: fullVideoBlob,
        duration: duration,
        interviewId: options.interviewId,
        email: options.email,
        interviewType: options.interviewType,
      });

      if (uploadResult.success && uploadResult.recordingUrl) {
        options.onRecordingComplete?.(uploadResult.recordingUrl);
      } else {
        options.onError?.(uploadResult.error || 'Upload failed');
      }
    };

    // Start recording
    mediaRecorder.start(1000); // Record in 1-second chunks

    const stop = async (): Promise<void> => {
      return new Promise((resolve) => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.addEventListener('stop', () => resolve(), { once: true });
          mediaRecorder.stop();
        } else {
          resolve();
        }
      });
    };

    return {
      recorder: mediaRecorder,
      stop
    };
  }

  /**
   * Submit interview with answers and automatic recording upload
   */
  async submitInterview(params: {
    interviewId: string;
    email: string;
    interviewType: string;
    answers: Record<string, any>;
    recordingBlob?: Blob;
    onSuccess?: () => void;
    onError?: (error: string) => void;
  }): Promise<void> {
    try {
      if (this.toast) {
        this.toast({
          title: "Submitting interview...",
          description: "Please wait while we save your responses.",
        });
      }

      // If recording blob is provided, upload it with answers
      if (params.recordingBlob) {
        const uploadResult = await this.uploadRecording({
          blob: params.recordingBlob,
          duration: 0, // Duration not critical for final submission
          interviewId: params.interviewId,
          email: params.email,
          interviewType: params.interviewType,
          answers: params.answers,
        });

        if (uploadResult.success) {
          if (this.toast) {
            this.toast({
              title: "Interview submitted successfully",
              description: "Thank you for completing the interview.",
            });
          }
          params.onSuccess?.();
        } else {
          throw new Error(uploadResult.error || 'Submission failed');
        }
      } else {
        // Submit answers only (for interviews without recording)
        const response = await fetch('/api/interview/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            interviewId: params.interviewId,
            email: params.email,
            answers: params.answers,
          }),
        });

        if (response.ok) {
          if (this.toast) {
            this.toast({
              title: "Interview submitted successfully",
              description: "Thank you for completing the interview.",
            });
          }
          params.onSuccess?.();
        } else {
          throw new Error('Failed to submit interview');
        }
      }

    } catch (error) {
      console.error('Interview submission error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Submission failed';
      
      if (this.toast) {
        this.toast({
          title: "Submission failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      params.onError?.(errorMessage);
    }
  }
}