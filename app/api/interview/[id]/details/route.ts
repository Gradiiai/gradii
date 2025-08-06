import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { Interview, CodingInterview, campaignInterviews, candidates, jobCampaigns, companies } from '@/lib/database/schema';
import { eq, and, or } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!id) {
      return NextResponse.json(
        { error: 'Interview ID is required' },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Try to find interview in multiple places
    let interviewData = null;

    // 1. Check Campaign Interviews first
    try {
      const campaignInterview = await db
        .select({
          id: campaignInterviews.id,
          interviewId: campaignInterviews.interviewId,
          interviewType: campaignInterviews.interviewType,
          scheduledAt: campaignInterviews.scheduledAt,
          status: campaignInterviews.status,
          interviewLink: campaignInterviews.interviewLink,
          candidateNotes: campaignInterviews.candidateNotes,
          candidateEmail: candidates.email,
          candidateName: candidates.name,
          jobTitle: jobCampaigns.jobTitle,
          companyName: companies.name,
          companyLogo: companies.logo,
          jobDescription: jobCampaigns.jobDescription,
        })
        .from(campaignInterviews)
        .innerJoin(candidates, eq(campaignInterviews.candidateId, candidates.id))
        .innerJoin(jobCampaigns, eq(campaignInterviews.campaignId, jobCampaigns.id))
        .innerJoin(companies, eq(jobCampaigns.companyId, companies.id))
        .where(
          and(
            eq(campaignInterviews.interviewId, id),
            eq(candidates.email, email)
          )
        )
        .limit(1);

      if (campaignInterview.length > 0) {
        const interview = campaignInterview[0];
        interviewData = {
          id: interview.id,
          interviewId: interview.interviewId,
          jobTitle: interview.jobTitle,
          companyName: interview.companyName,
          companyLogo: interview.companyLogo,
          interviewType: interview.interviewType,
          scheduledAt: interview.scheduledAt,
          duration: 60, // Default duration
          status: interview.status,
          instructions: interview.jobDescription,
          candidateEmail: interview.candidateEmail,
          candidateName: interview.candidateName,
          interviewerName: 'Interviewer',
          interviewerTitle: 'HR Representative',
        };
      }
    } catch (campaignError) {
      console.warn('Error checking campaign interviews:', campaignError);
    }

    // 2. Check regular Interview table if not found in campaigns
    if (!interviewData) {
      try {
        const regularInterview = await db
          .select({
            id: Interview.id,
            interviewId: Interview.interviewId,
            jobPosition: Interview.jobPosition,
            jobDescription: Interview.jobDescription,
            candidateEmail: Interview.candidateEmail,
            candidateName: Interview.candidateName,
            interviewDate: Interview.interviewDate,
            interviewTime: Interview.interviewTime,
            interviewType: Interview.interviewType,
            interviewStatus: Interview.interviewStatus,
            interviewLink: Interview.interviewLink,
          })
          .from(Interview)
          .where(
            and(
              eq(Interview.interviewId, id),
              eq(Interview.candidateEmail, email)
            )
          )
          .limit(1);

        if (regularInterview.length > 0) {
          const interview = regularInterview[0];
          const scheduledAt = interview.interviewDate && interview.interviewTime 
            ? new Date(`${interview.interviewDate} ${interview.interviewTime}`)
            : new Date();

          interviewData = {
            id: interview.id,
            interviewId: interview.interviewId,
            jobTitle: interview.jobPosition,
            companyName: 'Company',
            interviewType: interview.interviewType || 'behavioral',
            scheduledAt: scheduledAt,
            duration: 60,
            status: interview.interviewStatus || 'scheduled',
            instructions: interview.jobDescription,
            candidateEmail: interview.candidateEmail,
            candidateName: interview.candidateName,
            interviewerName: 'Interviewer',
            interviewerTitle: 'HR Representative',
          };
        }
      } catch (regularError) {
        console.warn('Error checking regular interviews:', regularError);
      }
    }

    // 3. Check CodingInterview table as fallback
    if (!interviewData) {
      try {
        const codingInterview = await db
          .select({
            id: CodingInterview.id,
            interviewId: CodingInterview.interviewId,
            interviewTopic: CodingInterview.interviewTopic,
            candidateEmail: CodingInterview.candidateEmail,
            candidateName: CodingInterview.candidateName,
            interviewDate: CodingInterview.interviewDate,
            interviewTime: CodingInterview.interviewTime,
            timeLimit: CodingInterview.timeLimit,
            difficultyLevel: CodingInterview.difficultyLevel,
            programmingLanguage: CodingInterview.programmingLanguage,
            interviewStatus: CodingInterview.interviewStatus,
            interviewLink: CodingInterview.interviewLink,
          })
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
          const scheduledAt = interview.interviewDate && interview.interviewTime 
            ? new Date(`${interview.interviewDate} ${interview.interviewTime}`)
            : new Date();

          interviewData = {
            id: interview.id,
            interviewId: interview.interviewId,
            jobTitle: interview.interviewTopic || 'Coding Interview',
            companyName: 'Company',
            interviewType: 'coding',
            scheduledAt: scheduledAt,
            duration: interview.timeLimit || 60,
            status: interview.interviewStatus || 'scheduled',
            instructions: `Programming Language: ${interview.programmingLanguage}\nDifficulty: ${interview.difficultyLevel}`,
            candidateEmail: interview.candidateEmail,
            candidateName: interview.candidateName,
            interviewerName: 'System',
            interviewerTitle: 'Automated Interview',
          };
        }
      } catch (codingError) {
        console.warn('Error checking coding interviews:', codingError);
      }
    }

    if (!interviewData) {
      return NextResponse.json(
        { error: 'Interview not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      interview: interviewData
    });

  } catch (error) {
    console.error('Error fetching interview details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}