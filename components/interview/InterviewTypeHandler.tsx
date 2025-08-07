'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useInterviewFlow, useQuestionTimer } from '@/shared/hooks/useInterviewFlow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Button } from '@/components/ui/shared/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/shared/badge';
import { 
  Clock, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft, 
  FileText, 
  Code, 
  MessageSquare,
  BarChart3,
  Trophy,
  Target
} from 'lucide-react';

interface InterviewTypeHandlerProps {
  interviewType: 'mcq' | 'coding' | 'behavioral' | 'combo';
  flowType?: 'direct' | 'campaign';
}

export default function InterviewTypeHandler({ 
  interviewType, 
  flowType = 'direct' 
}: InterviewTypeHandlerProps) {
  const searchParams = useSearchParams();
  const interviewId = searchParams.get('id') || '';
  const candidateEmail = searchParams.get('email') || '';

  const {
    flow,
    currentQuestion,
    progress,
    isLoading,
    error,
    isCompleted,
    analysisResult,
    initializeInterview,
    submitAnswer,
    completeInterview
  } = useInterviewFlow();

  const { timeSpent, startTimer, getTimeSpent } = useQuestionTimer();
  const [currentAnswer, setCurrentAnswer] = useState<any>('');
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (interviewId && candidateEmail) {
      initializeInterview(interviewId, candidateEmail, interviewType, flowType);
    }
  }, [interviewId, candidateEmail, interviewType, flowType, initializeInterview]);

  useEffect(() => {
    if (currentQuestion) {
      startTimer();
      setCurrentAnswer('');
    }
  }, [currentQuestion, startTimer]);

  useEffect(() => {
    if (isCompleted && !showResults) {
      handleShowResults();
    }
  }, [isCompleted]);

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !flow) return;
    
    const timeSpentSeconds = getTimeSpent();
    await submitAnswer(currentQuestion.id.toString(), currentAnswer, timeSpentSeconds);
  };

  const handleShowResults = async () => {
    if (flow && isCompleted) {
      setShowResults(true);
    }
  };

  const getQuestionIcon = (type: string) => {
    switch (type) {
      case 'mcq': return <FileText className="w-5 h-5" />;
      case 'coding': return <Code className="w-5 h-5" />;
      case 'behavioral': return <MessageSquare className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getInterviewTypeColor = (type: string) => {
    switch (type) {
      case 'mcq': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'coding': return 'bg-green-100 text-green-800 border-green-200';
      case 'behavioral': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'combo': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading interview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertDescription className="text-red-800">{error}</AlertDescription>
      </Alert>
    );
  }

  if (showResults && analysisResult) {
    return <InterviewResults analysisResult={analysisResult} interviewType={interviewType} />;
  }

  if (!flow || !currentQuestion) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertDescription className="text-yellow-800">
          No questions available for this interview. Please contact support.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getQuestionIcon(interviewType)}
          <div>
            <h1 className="text-2xl font-bold capitalize">{interviewType} Interview</h1>
            <Badge className={getInterviewTypeColor(interviewType)}>
              {flowType === 'direct' ? 'Direct Interview' : 'Campaign Interview'}
            </Badge>
          </div>
        </div>
        
        {progress && (
          <div className="text-right">
            <div className="text-sm text-gray-600 mb-1">
              Question {progress.current} of {progress.total}
            </div>
            <Progress value={progress.percentage} className="w-32" />
          </div>
        )}
      </div>

      {/* Timer */}
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg">
          <Clock className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium">{Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</span>
        </div>
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {getQuestionIcon(currentQuestion.type || interviewType)}
            <span>Question {progress?.current}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <QuestionRenderer
            question={currentQuestion}
            questionType={currentQuestion.type || interviewType}
            answer={currentAnswer}
            onAnswerChange={setCurrentAnswer}
          />
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {progress && `${progress.current} of ${progress.total} questions`}
        </div>
        
        <Button 
          onClick={handleSubmitAnswer}
          disabled={!currentAnswer || isLoading}
          className="flex items-center space-x-2"
        >
          <span>{progress?.current === progress?.total ? 'Complete Interview' : 'Next Question'}</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function QuestionRenderer({ 
  question, 
  questionType, 
  answer, 
  onAnswerChange 
}: {
  question: any;
  questionType: string;
  answer: any;
  onAnswerChange: (answer: any) => void;
}) {
  switch (questionType) {
    case 'mcq':
      return <MCQRenderer question={question} answer={answer} onAnswerChange={onAnswerChange} />;
    case 'coding':
      return <CodingRenderer question={question} answer={answer} onAnswerChange={onAnswerChange} />;
    case 'behavioral':
      return <BehavioralRenderer question={question} answer={answer} onAnswerChange={onAnswerChange} />;
    default:
      return <div>Unsupported question type: {questionType}</div>;
  }
}

function MCQRenderer({ question, answer, onAnswerChange }: any) {
  return (
    <div className="space-y-4">
      <div className="text-lg font-medium">{question.question}</div>
      
      <div className="space-y-2">
        {question.options?.map((option: any) => (
          <label key={option.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="radio"
              name="mcq-answer"
              value={option.id}
              checked={answer === option.id}
              onChange={(e) => onAnswerChange(e.target.value)}
              className="form-radio"
            />
            <span>{option.text}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function CodingRenderer({ question, answer, onAnswerChange }: any) {
  return (
    <div className="space-y-4">
      <div className="text-lg font-medium">{question.question}</div>
      
      {question.description && (
        <div className="text-gray-600">{question.description}</div>
      )}
      
      {question.examples && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Examples:</h4>
          {question.examples.map((example: any, idx: number) => (
            <div key={idx} className="text-sm">
              <strong>Input:</strong> {example.input}<br />
              <strong>Output:</strong> {example.output}<br />
              {example.explanation && (
                <>
                  <strong>Explanation:</strong> {example.explanation}
                </>
              )}
            </div>
          ))}
        </div>
      )}
      
      <textarea
        className="w-full h-64 p-4 font-mono text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
        placeholder="Write your code here..."
        value={answer}
        onChange={(e) => onAnswerChange(e.target.value)}
      />
    </div>
  );
}

function BehavioralRenderer({ question, answer, onAnswerChange }: any) {
  return (
    <div className="space-y-4">
      <div className="text-lg font-medium">{question.question}</div>
      
      {question.keyPoints && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Key Points to Address:</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            {question.keyPoints.map((point: string, idx: number) => (
              <li key={idx}>{point}</li>
            ))}
          </ul>
        </div>
      )}
      
      <textarea
        className="w-full h-48 p-4 border rounded-lg focus:ring-2 focus:ring-blue-500"
        placeholder="Please provide a detailed response using the STAR method (Situation, Task, Action, Result)..."
        value={answer}
        onChange={(e) => onAnswerChange(e.target.value)}
      />
      
      <div className="text-sm text-gray-600">
        Tip: Use the STAR method - describe the Situation, Task, Action you took, and Results achieved.
      </div>
    </div>
  );
}

function InterviewResults({ analysisResult, interviewType }: { 
  analysisResult: any; 
  interviewType: string; 
}) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
          analysisResult.passed ? 'bg-green-100' : 'bg-red-100'
        }`}>
          {analysisResult.passed ? (
            <Trophy className="w-8 h-8 text-green-600" />
          ) : (
            <Target className="w-8 h-8 text-red-600" />
          )}
        </div>
        <h1 className="text-3xl font-bold mb-2">Interview Complete!</h1>
        <p className="text-gray-600">Your {interviewType} interview has been analyzed</p>
      </div>

      {/* Overall Score */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">{analysisResult.percentage}%</div>
            <div className="text-lg text-gray-600 mb-4">Overall Score</div>
            <Badge className={analysisResult.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
              {analysisResult.passed ? 'PASSED' : 'NEEDS IMPROVEMENT'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Performance Breakdown</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(analysisResult.breakdown).map(([type, data]: [string, any]) => (
            <div key={type} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="capitalize font-medium">{type}</span>
                <span className="text-sm text-gray-600">{data.percentage.toFixed(1)}%</span>
              </div>
              <Progress value={data.percentage} />
              <p className="text-sm text-gray-600">{data.feedback}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle>AI Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Candidate Profile</h4>
            <p className="text-gray-600">{analysisResult.aiInsights.candidateProfile}</p>
          </div>
          
          {analysisResult.summary.strengths.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-green-800">Strengths</h4>
              <ul className="list-disc list-inside space-y-1 text-green-700">
                {analysisResult.summary.strengths.map((strength: string, idx: number) => (
                  <li key={idx}>{strength}</li>
                ))}
              </ul>
            </div>
          )}
          
          {analysisResult.summary.improvements.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-orange-800">Areas for Improvement</h4>
              <ul className="list-disc list-inside space-y-1 text-orange-700">
                {analysisResult.summary.improvements.map((improvement: string, idx: number) => (
                  <li key={idx}>{improvement}</li>
                ))}
              </ul>
            </div>
          )}
          
          {analysisResult.summary.recommendations.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-blue-800">Recommendations</h4>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                {analysisResult.summary.recommendations.map((rec: string, idx: number) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overall Feedback */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertDescription className="text-blue-800">
          <strong>Overall Feedback:</strong> {analysisResult.summary.overallFeedback}
        </AlertDescription>
      </Alert>
    </div>
  );
}