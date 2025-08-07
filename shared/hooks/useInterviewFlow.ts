import { useState, useCallback } from 'react';
import { InterviewFlow, QuestionAnswer, InterviewAnalysisResult } from '@/lib/services/interview-scoring';

interface UseInterviewFlowReturn {
  flow: InterviewFlow | null;
  currentQuestion: any;
  progress: {
    current: number;
    total: number;
    percentage: number;
    timeElapsed: number;
  } | null;
  isLoading: boolean;
  error: string | null;
  isCompleted: boolean;
  analysisResult: InterviewAnalysisResult | null;
  
  // Actions
  initializeInterview: (
    interviewId: string,
    candidateEmail: string,
    interviewType: 'mcq' | 'coding' | 'behavioral' | 'combo',
    flowType?: 'direct' | 'campaign'
  ) => Promise<void>;
  submitAnswer: (questionId: string, answer: any, timeSpent: number) => Promise<void>;
  completeInterview: () => Promise<void>;
  getAnalysisResults: (interviewId: string) => Promise<void>;
}

export function useInterviewFlow(): UseInterviewFlowReturn {
  const [flow, setFlow] = useState<InterviewFlow | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<InterviewAnalysisResult | null>(null);

  const isCompleted = flow?.status === 'completed';

  const initializeInterview = useCallback(async (
    interviewId: string,
    candidateEmail: string,
    interviewType: 'mcq' | 'coding' | 'behavioral' | 'combo',
    flowType: 'direct' | 'campaign' = 'direct'
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/interview/flow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'initialize',
          interviewId,
          candidateEmail,
          interviewType,
          flowType
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize interview');
      }

      setFlow(data.flow);
      setCurrentQuestion(data.currentQuestion);
      setProgress(data.progress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error initializing interview:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitAnswer = useCallback(async (questionId: string, answer: any, timeSpent: number) => {
    if (!flow) {
      setError('No active interview flow');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/interview/flow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'submit_answer',
          flow,
          questionId,
          answer,
          timeSpent
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit answer');
      }

      setFlow(data.flow);
      setCurrentQuestion(data.currentQuestion);
      setProgress(data.progress);

      // If interview is completed, automatically get analysis
      if (data.isCompleted) {
        await completeInterview();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error submitting answer:', err);
    } finally {
      setIsLoading(false);
    }
  }, [flow]);

  const completeInterview = useCallback(async () => {
    if (!flow || flow.status !== 'completed') {
      setError('Interview not ready for completion');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/interview/flow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'complete',
          flow
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete interview');
      }

      setAnalysisResult(data.analysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error completing interview:', err);
    } finally {
      setIsLoading(false);
    }
  }, [flow]);

  const getAnalysisResults = useCallback(async (interviewId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/interview/flow?interviewId=${interviewId}`, {
        credentials: 'include'
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get analysis results');
      }

      if (data.hasResults) {
        setAnalysisResult(data.analysisResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error getting analysis results:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    flow,
    currentQuestion,
    progress,
    isLoading,
    error,
    isCompleted,
    analysisResult,
    initializeInterview,
    submitAnswer,
    completeInterview,
    getAnalysisResults
  };
}

// Helper hook for question timing
export function useQuestionTimer() {
  const [startTime, setStartTime] = useState<number>(0);
  const [timeSpent, setTimeSpent] = useState<number>(0);

  const startTimer = useCallback(() => {
    const now = Date.now();
    setStartTime(now);
    setTimeSpent(0);
  }, []);

  const getTimeSpent = useCallback(() => {
    if (startTime === 0) return 0;
    return Math.floor((Date.now() - startTime) / 1000); // Return seconds
  }, [startTime]);

  const updateTimeSpent = useCallback(() => {
    if (startTime > 0) {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
    }
  }, [startTime]);

  return {
    timeSpent,
    startTimer,
    getTimeSpent,
    updateTimeSpent
  };
}