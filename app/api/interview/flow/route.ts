import { NextRequest, NextResponse } from 'next/server';
import { UnifiedInterviewService } from '@/lib/services/interview-scoring';
import { verifyInterviewSession } from '@/lib/auth/redis-session';

/**
 * Interview Flow Management API
 * Handles initialization, progress tracking, and completion for all interview types
 * Supports both direct and campaign interview flows
 */

export async function POST(request: NextRequest) {
  try {
    const session = await verifyInterviewSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 401 });
    }

    const { action, interviewId, candidateEmail, interviewType, flowType, ...data } = await request.json();

    switch (action) {
      case 'initialize':
        return await handleInitialize(interviewId, candidateEmail, interviewType, flowType);
      
      case 'submit_answer':
        return await handleSubmitAnswer(data.flow, data.questionId, data.answer, data.timeSpent);
      
      case 'get_progress':
        return await handleGetProgress(data.flow);
      
      case 'complete':
        return await handleComplete(data.flow);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Interview flow error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleInitialize(
  interviewId: string, 
  candidateEmail: string, 
  interviewType: 'mcq' | 'coding' | 'behavioral' | 'combo',
  flowType: 'direct' | 'campaign' = 'direct'
) {
  try {
    const flow = await UnifiedInterviewService.initializeInterviewFlow(
      interviewId,
      candidateEmail,
      interviewType,
      flowType
    );

    return NextResponse.json({
      success: true,
      flow,
      currentQuestion: UnifiedInterviewService.getCurrentQuestion(flow),
      progress: UnifiedInterviewService.getProgress(flow)
    });
  } catch (error) {
    console.error('Error initializing interview flow:', error);
    return NextResponse.json({ error: 'Failed to initialize interview' }, { status: 500 });
  }
}

async function handleSubmitAnswer(flow: any, questionId: string, answer: any, timeSpent: number) {
  try {
    const updatedFlow = UnifiedInterviewService.submitAnswer(flow, questionId, answer, timeSpent);
    
    return NextResponse.json({
      success: true,
      flow: updatedFlow,
      currentQuestion: UnifiedInterviewService.getCurrentQuestion(updatedFlow),
      progress: UnifiedInterviewService.getProgress(updatedFlow),
      isCompleted: updatedFlow.status === 'completed'
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    return NextResponse.json({ error: 'Failed to submit answer' }, { status: 500 });
  }
}

async function handleGetProgress(flow: any) {
  try {
    const progress = UnifiedInterviewService.getProgress(flow);
    const currentQuestion = UnifiedInterviewService.getCurrentQuestion(flow);
    
    return NextResponse.json({
      success: true,
      progress,
      currentQuestion,
      isCompleted: flow.status === 'completed'
    });
  } catch (error) {
    console.error('Error getting progress:', error);
    return NextResponse.json({ error: 'Failed to get progress' }, { status: 500 });
  }
}

async function handleComplete(flow: any) {
  try {
    const analysisResult = await UnifiedInterviewService.completeInterview(flow);
    
    return NextResponse.json({
      success: true,
      analysisResult,
      message: 'Interview completed successfully'
    });
  } catch (error) {
    console.error('Error completing interview:', error);
    return NextResponse.json({ error: 'Failed to complete interview' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyInterviewSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 401 });
    }

    const url = new URL(request.url);
    const interviewId = url.searchParams.get('interviewId');
    
    if (!interviewId) {
      return NextResponse.json({ error: 'Interview ID required' }, { status: 400 });
    }

    // Get existing analysis results
    const analysisResult = await UnifiedInterviewService.getAnalysisResults(interviewId);
    
    return NextResponse.json({
      success: true,
      analysisResult,
      hasResults: !!analysisResult
    });
  } catch (error) {
    console.error('Error fetching interview results:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}