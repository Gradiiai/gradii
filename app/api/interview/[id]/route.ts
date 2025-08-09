import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { Interview, CodingInterview, campaignInterviews, interviewSetups, jobCampaigns, companies, candidateResults, candidateUsers } from '@/lib/database/schema';
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
          candidateEmail: email,
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
          candidateEmail: email,
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
          candidateEmail: email,
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

    switch (action) {
      case 'start':
        console.log(`Starting interview ${id} for ${email}`);
        return NextResponse.json({ success: true });
        
      case 'submit':
        console.log(`Submitting interview ${id} for ${email}`);
        return await handleInterviewSubmission(id, email, body);
        
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

// Handle interview submission and save to candidateResults
async function handleInterviewSubmission(interviewId: string, sessionEmail: string, submissionData: any) {
  try {
    const { answers, timeSpent, programmingLanguage, questionType, videoRecordingUrl, candidateEmail } = submissionData;
    
    console.log('Interview submission data:', {
      interviewId,
      timeSpent,
      questionType,
      answersCount: answers ? answers.length : 'no answers'
    });
    
    // Use candidateEmail from submission data if provided, otherwise use session email
    const emailToUse = candidateEmail || sessionEmail;

    // Determine interview type from the submission data or fetch from database
    let interviewType = questionType || 'combo';
    let totalQuestions = 0;
    let answeredQuestions = 0;
    let score = 0;
    let maxScore = 0;

    // Find the interview to get type and calculate scores
    const directInterview = await db
      .select()
      .from(Interview)
      .where(eq(Interview.interviewId, interviewId))
      .limit(1);

    let currentInterview: any = null;
    if (directInterview.length > 0) {
      currentInterview = directInterview[0];
      interviewType = currentInterview.interviewType || 'combo';
    } else {
      // Try coding interview table
      const codingInterview = await db
        .select()
        .from(CodingInterview)
        .where(eq(CodingInterview.interviewId, interviewId))
        .limit(1);
      
      if (codingInterview.length > 0) {
        currentInterview = codingInterview[0];
        interviewType = 'coding';
      }
    }

    // Get original interview questions to pair with answers
    let originalQuestions: any[] = [];
    if (currentInterview) {
      try {
        const questionsData = currentInterview.interviewQuestions || currentInterview.codingQuestions;
        if (questionsData) {
          originalQuestions = typeof questionsData === 'string' ? JSON.parse(questionsData) : questionsData;
        }
      } catch (error) {
        console.error('Error parsing original interview questions:', error);
        originalQuestions = [];
      }
    }

    // Process answers based on format and pair with original questions
    let formattedAnswers: any[] = [];
    if (answers) {
      if (Array.isArray(answers)) {
        // Pair answers with original questions
        formattedAnswers = answers.map((answer: any, index: number) => ({
          ...answer,
          question: answer.question || 
                   (originalQuestions[index]?.question || originalQuestions[index]?.Question || originalQuestions[index]?.problemDescription) ||
                   `Question ${index + 1}`,
          questionId: answer.questionId || `q_${index}`,
          questionIndex: index
        }));
      } else if (typeof answers === 'object' && answers.code) {
        // Coding interview format
        formattedAnswers = [{
          question: originalQuestions[0]?.question || originalQuestions[0]?.problemDescription || 'Coding Challenge',
          userAnswer: answers.code,
          language: answers.language || programmingLanguage,
          questionId: answers.questionId || 'coding_1',
          questionIndex: 0
        }];
      } else if (typeof answers === 'object') {
        // Convert object format to array and pair with questions
        const sortedKeys = Object.keys(answers).sort((a, b) => parseInt(a) - parseInt(b));
        formattedAnswers = sortedKeys.map((key, index) => ({
          questionIndex: parseInt(key) || index,
          question: originalQuestions[index]?.question || 
                   originalQuestions[index]?.Question || 
                   originalQuestions[index]?.problemDescription ||
                   `Question ${index + 1}`,
          userAnswer: answers[key],
          questionId: `q_${key}`,
          answer: answers[key] // Keep both formats for compatibility
        }));
      }
    }

    totalQuestions = formattedAnswers.length || 1;
    answeredQuestions = formattedAnswers.filter(a => 
      a.answer || a.userAnswer || a.code || a.selectedOption
    ).length;
    score = answeredQuestions; // Basic scoring - could be improved
    maxScore = totalQuestions;

    // Get or create candidate user record
    let candidateUserId: string;
    const candidateNameFromEmail = emailToUse.split('@')[0];
    
    // Try to find existing candidate user
    const existingCandidate = await db
      .select({ id: candidateUsers.id })
      .from(candidateUsers)
      .where(eq(candidateUsers.email, emailToUse))
      .limit(1);

    if (existingCandidate.length > 0) {
      candidateUserId = existingCandidate[0].id;
    } else {
      // Create new candidate user if not exists
              const [newCandidate] = await db
          .insert(candidateUsers)
          .values({
            email: emailToUse,
            firstName: candidateNameFromEmail,
            lastName: '',
            isActive: true,
            isEmailVerified: false
          })
          .returning({ id: candidateUsers.id });
      
      candidateUserId = newCandidate.id;
    }

    // Check if candidate interview history record exists for this specific candidate
    const existingHistory = await db
      .select()
      .from(candidateResults)
      .where(and(
        eq(candidateResults.interviewId, interviewId),
        eq(candidateResults.candidateId, candidateUserId)
      ))
      .limit(1);

    const structuredAnswers = {
      answers: formattedAnswers,
      submittedAt: new Date().toISOString(),
      interviewType: interviewType,
      timeSpent: timeSpent || 0,
      score: score,
      maxScore: maxScore,
      completionRate: totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0,
      videoRecordingUrl: videoRecordingUrl || null
    };

    if (existingHistory.length > 0) {
      // Update existing record for this specific candidate
      await db
        .update(candidateResults)
        .set({
          status: 'completed',
          completedAt: new Date(),
          feedback: JSON.stringify(structuredAnswers),
          score: score,
          maxScore: maxScore,
          duration: Math.round((timeSpent || 0) / 60), // Convert to minutes

          passed: (answeredQuestions / totalQuestions) >= 0.6,
          programmingLanguage: programmingLanguage || null,
          recordingUrl: videoRecordingUrl || null
        })
        .where(and(
          eq(candidateResults.interviewId, interviewId),
          eq(candidateResults.candidateId, candidateUserId)
        ));
    } else {
      // Create new record if it doesn't exist
      await db.insert(candidateResults).values({
        interviewId: interviewId,
        candidateId: candidateUserId,
        interviewType: interviewType,
        status: 'completed',
        completedAt: new Date(),
        feedback: JSON.stringify(structuredAnswers),
        score: score,
        maxScore: maxScore,
        duration: Math.round((timeSpent || 0) / 60), // Convert to minutes
        passed: (answeredQuestions / totalQuestions) >= 0.6,
        startedAt: new Date(), // Assume started at completion time for now
        roundNumber: 1,
        programmingLanguage: programmingLanguage || null,
        recordingUrl: videoRecordingUrl || null
      });
    }

    // Update the original interview status
    if (currentInterview) {
      if (interviewType === 'coding') {
        await db
          .update(CodingInterview)
          .set({ 
            interviewStatus: 'completed',
            updatedAt: new Date()
          })
          .where(eq(CodingInterview.interviewId, interviewId));
      } else {
        await db
          .update(Interview)
          .set({ 
            interviewStatus: 'completed',
            updatedAt: new Date()
          })
          .where(eq(Interview.interviewId, interviewId));
      }
    }

    console.log(`Successfully saved ${interviewType} interview results for interview ${interviewId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Interview submitted successfully',
      data: {
        interviewId,
        status: 'completed',
        totalQuestions,
        answeredQuestions,
        score,
        maxScore
      }
    });

  } catch (error) {
    console.error('Error saving interview submission:', error);
    return NextResponse.json(
      { error: 'Failed to save interview submission' },
      { status: 500 }
    );
  }
}