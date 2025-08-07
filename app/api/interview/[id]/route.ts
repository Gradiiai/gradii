import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { Interview, CodingInterview, campaignInterviews, interviewSetups, jobCampaigns, companies } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { verifyInterviewSession } from '@/lib/auth/redis-session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verify interview session
    const session = await verifyInterviewSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Please complete OTP verification first.' },
        { status: 401 }
      );
    }
    
    const email = session.email;

    // Try to find in direct interviews first
    const directInterview = await db
      .select()
      .from(Interview)
      .where(
        and(
          eq(Interview.interviewId, id),
          eq(Interview.candidateEmail, email)
        )
      )
      .limit(1);

    if (directInterview.length > 0) {
      const interview = directInterview[0];
      
      // Parse interview questions if they're stored as JSON string
      let questions = [];
      try {
        if (interview.interviewQuestions) {
          questions = typeof interview.interviewQuestions === 'string' 
            ? JSON.parse(interview.interviewQuestions) 
            : interview.interviewQuestions;
        }
      } catch (error) {
        console.error('Error parsing interview questions:', error);
        questions = [];
      }

      return NextResponse.json({
        success: true,
        interview: {
          id: interview.interviewId,
          title: `${interview.interviewType} Interview`,
          type: interview.interviewType,
          interviewType: interview.interviewType,
          companyName: 'Company',
          jobTitle: interview.jobPosition,
          duration: 60,
          scheduledAt: interview.interviewDate,
          status: interview.interviewStatus,
          instructions: 'Complete the interview questions to the best of your ability.',
          questions: questions,
          interviewQuestions: interview.interviewQuestions,
        }
      });
    }

    // Try to find in campaign interviews
    const campaignInterview = await db
      .select({
        id: campaignInterviews.id,
        interviewId: campaignInterviews.interviewId,
        interviewType: campaignInterviews.interviewType,
        setupId: campaignInterviews.setupId,
        campaignId: campaignInterviews.campaignId,
        scheduledAt: campaignInterviews.scheduledAt,
        status: campaignInterviews.status
      })
      .from(campaignInterviews)
      .where(eq(campaignInterviews.interviewId, id))
      .limit(1);

    if (campaignInterview.length > 0) {
      const interview = campaignInterview[0];
      
      // Get campaign details
      const campaign = await db
        .select({
          jobTitle: jobCampaigns.jobTitle,
          companyId: jobCampaigns.companyId
        })
        .from(jobCampaigns)
        .where(eq(jobCampaigns.id, interview.campaignId))
        .limit(1);

      // Get setup details
      const setup = await db
        .select()
        .from(interviewSetups)
        .where(eq(interviewSetups.id, interview.setupId || ''))
        .limit(1);

      // Get interview questions from Interview table
      const interviewData = await db
        .select({
          interviewQuestions: Interview.interviewQuestions
        })
        .from(Interview)
        .where(eq(Interview.interviewId, interview.interviewId))
        .limit(1);

      let companyName = 'Company';
      if (campaign.length > 0 && campaign[0].companyId) {
        const company = await db
          .select({ name: companies.name })
          .from(companies)
          .where(eq(companies.id, campaign[0].companyId))
          .limit(1);
        
        if (company.length > 0) {
          companyName = company[0].name;
        }
      }

      // Parse interview questions if they're stored as JSON string
      let questions = [];
      try {
        const questionsData = interviewData.length > 0 ? interviewData[0].interviewQuestions : null;
        if (questionsData) {
          questions = typeof questionsData === 'string' 
            ? JSON.parse(questionsData) 
            : questionsData;
        }
      } catch (error) {
        console.error('Error parsing campaign interview questions:', error);
        questions = [];
      }

      return NextResponse.json({
        success: true,
        interview: {
          id: interview.interviewId,
          title: `${interview.interviewType} Interview`,
          type: interview.interviewType,
          interviewType: interview.interviewType,
          companyName: companyName,
          jobTitle: campaign.length > 0 ? campaign[0].jobTitle : 'Position',
          duration: setup.length > 0 ? setup[0].timeLimit : 60,
          scheduledAt: interview.scheduledAt,
          status: interview.status,
          instructions: setup.length > 0 ? setup[0].instructions : 'Complete the interview questions to the best of your ability.',
          questions: questions,
          interviewQuestions: interviewData.length > 0 ? interviewData[0].interviewQuestions : null,
        }
      });
    }

    // Try coding interviews table for backward compatibility
    const codingInterview = await db
      .select()
      .from(CodingInterview)
      .where(
        and(
          eq(CodingInterview.interviewId, id),
          eq(CodingInterview.candidateEmail, email)
        )
      )
      .limit(1);

    if (codingInterview.length > 0) {
      const interview = codingInterview[0];
      
      // Parse coding questions if they're stored as JSON string
      let questions = [];
      try {
        if (interview.codingQuestions) {
          questions = typeof interview.codingQuestions === 'string' 
            ? JSON.parse(interview.codingQuestions) 
            : interview.codingQuestions;
        }
      } catch (error) {
        console.error('Error parsing coding questions:', error);
        questions = [];
      }

      return NextResponse.json({
        success: true,
        interview: {
          id: interview.interviewId,
          title: 'Coding Interview',
          type: 'coding',
          interviewType: 'coding',
          companyName: 'Company',
          jobTitle: interview.interviewTopic,
          duration: 60,
          scheduledAt: interview.interviewDate,
          status: interview.interviewStatus,
          instructions: 'Complete the coding challenges to demonstrate your programming skills.',
          questions: questions,
          interviewQuestions: interview.codingQuestions,
        }
      });
    }

    return NextResponse.json(
      { error: 'Interview not found' },
      { status: 404 }
    );

  } catch (error) {
    console.error('Error fetching interview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    // Verify interview session
    const session = await verifyInterviewSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Please complete OTP verification first.' },
        { status: 401 }
      );
    }
    
    const email = session.email;

    // For now, just return success for all actions
    // In production, you would implement proper action handling
    switch (action) {
      case 'start':
        console.log(`Starting interview ${id} for ${email}`);
        return NextResponse.json({ success: true });
        
      case 'submit':
        console.log(`Submitting interview ${id} for ${email}`);
        return NextResponse.json({ success: true });
        
      case 'save_progress':
        console.log(`Saving progress for interview ${id} for ${email}`);
        return NextResponse.json({ success: true });
        
      default:
        return NextResponse.json({ success: true });
    }

  } catch (error) {
    console.error('Error handling interview action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}