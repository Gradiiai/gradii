import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { candidateResults, candidateUsers, Interview, CodingInterview, jobCampaigns, candidateApplications, companies } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log(`Fetching completed interview data for ID: ${id}`);

    // Find the completed interview in candidateResults table
    const completedInterview = await db
      .select({
        // Core interview result data
        historyId: candidateResults.id,
        interviewId: candidateResults.interviewId,
        interviewType: candidateResults.interviewType,
        status: candidateResults.status,
        score: candidateResults.score,
        maxScore: candidateResults.maxScore,
        duration: candidateResults.duration,
        feedback: candidateResults.feedback,
        completedAt: candidateResults.completedAt,
        startedAt: candidateResults.startedAt,
        passed: candidateResults.passed,
        programmingLanguage: candidateResults.programmingLanguage,
        
        // Candidate data
        candidateName: candidateUsers.firstName,
        candidateLastName: candidateUsers.lastName,
        candidateEmail: candidateUsers.email,
        
        // Application data (if available)
        applicationId: candidateResults.applicationId,
      })
      .from(candidateResults)
      .innerJoin(candidateUsers, eq(candidateResults.candidateId, candidateUsers.id))
      .leftJoin(candidateApplications, eq(candidateResults.applicationId, candidateApplications.id))
      .where(eq(candidateResults.interviewId, id))
      .limit(1);

    if (completedInterview.length === 0) {
      // If not found in candidateResults, check if interview exists in Interview table
      const directInterview = await db
        .select()
        .from(Interview)
        .where(eq(Interview.interviewId, id))
        .limit(1);
      
      if (directInterview.length > 0) {
        const interview = directInterview[0];
        // Return basic interview data even if not submitted
        return NextResponse.json({
          success: true,
          data: {
            interviewId: interview.interviewId,
            interviewType: interview.interviewType,
            status: interview.interviewStatus || 'not_submitted',
            candidateEmail: interview.candidateEmail,
            jobPosition: interview.jobPosition,
            completedAt: interview.updatedAt || interview.createdAt,
            score: 0,
            maxScore: 0,
            passed: false,
            feedback: 'Interview not properly submitted. Please contact support.',
            questions: [],
            answers: []
          }
        });
      }
      
      // Also check CodingInterview table
      const codingInterview = await db
        .select()
        .from(CodingInterview)
        .where(eq(CodingInterview.interviewId, id))
        .limit(1);
      
      if (codingInterview.length > 0) {
        const interview = codingInterview[0];
        return NextResponse.json({
          success: true,
          data: {
            interviewId: interview.interviewId,
            interviewType: 'coding',
            status: interview.interviewStatus || 'not_submitted',
            candidateEmail: interview.candidateEmail,
            interviewTopic: interview.interviewTopic,
            completedAt: interview.updatedAt || interview.createdAt,
            score: 0,
            maxScore: 0,
            passed: false,
            feedback: 'Interview not properly submitted. Please contact support.',
            questions: [],
            answers: []
          }
        });
      }
      
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    const result = completedInterview[0];
    
    // Get additional interview details from Interview or CodingInterview tables
    let interviewDetails: any = null;
    let companyName = 'Company';
    let jobTitle = 'Position';

    // Try to get details from Interview table
    const directInterview = await db
      .select({
        jobPosition: Interview.jobPosition,
        candidateName: Interview.candidateName,
        candidateEmail: Interview.candidateEmail,
        companyId: Interview.companyId,
        interviewType: Interview.interviewType,
        createdAt: Interview.createdAt,
        interviewQuestions: Interview.interviewQuestions
      })
      .from(Interview)
      .where(eq(Interview.interviewId, id))
      .limit(1);

    if (directInterview.length > 0) {
      interviewDetails = directInterview[0];
      jobTitle = interviewDetails.jobPosition;
      
      // Get company name
      if (interviewDetails.companyId) {
        const company = await db
          .select({ name: companies.name })
          .from(companies)
          .where(eq(companies.id, interviewDetails.companyId))
          .limit(1);
        
        if (company.length > 0) {
          companyName = company[0].name;
        }
      }
    } else {
      // Try CodingInterview table
      const codingInterview = await db
        .select({
          interviewTopic: CodingInterview.interviewTopic,
          candidateName: CodingInterview.candidateName,
          candidateEmail: CodingInterview.candidateEmail,
          companyId: CodingInterview.companyId,
          createdAt: CodingInterview.createdAt
        })
        .from(CodingInterview)
        .where(eq(CodingInterview.interviewId, id))
        .limit(1);
      
      if (codingInterview.length > 0) {
        interviewDetails = codingInterview[0];
        jobTitle = interviewDetails.interviewTopic;
        
        // Get company name
        if (interviewDetails.companyId) {
          const company = await db
            .select({ name: companies.name })
            .from(companies)
            .where(eq(companies.id, interviewDetails.companyId))
            .limit(1);
          
          if (company.length > 0) {
            companyName = company[0].name;
          }
        }
      }
    }

    // If it's a campaign interview, get campaign details
    if (result.applicationId) {
      const campaignDetails = await db
        .select({
          jobTitle: jobCampaigns.jobTitle,
          campaignName: jobCampaigns.campaignName,
          companyId: jobCampaigns.companyId,
        })
        .from(candidateApplications)
        .innerJoin(jobCampaigns, eq(candidateApplications.campaignId, jobCampaigns.id))
        .where(eq(candidateApplications.id, result.applicationId))
        .limit(1);
      
      if (campaignDetails.length > 0) {
        jobTitle = campaignDetails[0].jobTitle;
        
        // Get company name
        const company = await db
          .select({ name: companies.name })
          .from(companies)
          .where(eq(companies.id, campaignDetails[0].companyId))
          .limit(1);
        
        if (company.length > 0) {
          companyName = company[0].name;
        }
      }
    }

    // Parse feedback to get question count
    let totalQuestions = 0;
    let answeredQuestions = 0;
    if (result.feedback) {
      try {
        const feedbackData = JSON.parse(result.feedback);
        if (feedbackData.answers && Array.isArray(feedbackData.answers)) {
          totalQuestions = feedbackData.answers.length;
          answeredQuestions = feedbackData.answers.filter((a: any) => {
            const answer = a.answer || a.userAnswer || a.selectedOption || a.response || a.code;
            if (answer === undefined || answer === null) return false;
            if (typeof answer === 'string') return answer.trim() !== '' && answer !== 'No answer provided';
            return true; // Non-string answers (numbers, objects) are considered answered
          }).length;
        }
      } catch (error) {
        console.error('Error parsing feedback:', error);
      }
    }

    // Format the response data
    const responseData = {
      id: result.interviewId,
      title: `${result.interviewType.charAt(0).toUpperCase() + result.interviewType.slice(1)} Interview`,
      companyName: companyName,
      jobTitle: jobTitle,
      interviewType: result.interviewType,
      completedAt: result.completedAt,
      timeSpent: (result.duration || 0) * 60, // Convert minutes back to seconds for display
      actualDuration: (result.duration || 0) * 60, // Convert minutes back to seconds for display
      totalQuestions: totalQuestions,
      answeredQuestions: answeredQuestions,
      score: result.score || 0,
      maxScore: result.maxScore || 0,
      passed: result.passed,
      programmingLanguage: result.programmingLanguage,
      candidateName: result.candidateName && result.candidateLastName 
        ? `${result.candidateName} ${result.candidateLastName}`.trim()
        : result.candidateName || 'Candidate',
      candidateEmail: result.candidateEmail,
      status: result.status
    };

    console.log('Returning completed interview data:', responseData);

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error fetching completed interview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch completed interview details' },
      { status: 500 }
    );
  }
}
