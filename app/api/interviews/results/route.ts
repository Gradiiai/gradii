import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { candidateResults, candidateUsers, candidateApplications, jobCampaigns, companies, Interview, CodingInterview, users } from '@/lib/database/schema';
import { eq, and, desc, or, sql } from 'drizzle-orm';
import { auth } from '@/auth';

// GET /api/Interview/results
export async function GET(request: NextRequest) {
  try {
    // Authenticate using session
    const session = await auth();
    
    console.log('Session data:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userRole: session?.user?.role,
      companyId: session?.user?.companyId
    });
    
    if (!session?.user) {
      console.log('No session found, returning 401');
      return NextResponse.json(
        { error: 'Authentication required. Please log in again.' },
        { status: 401 }
      );
    }

    // Additional validation for user data
    if (!session.user.id) {
      console.log('Session found but no user ID, returning 401');
      return NextResponse.json(
        { error: 'Invalid session. Please log in again.' },
        { status: 401 }
      );
    }

    if (!session.user.companyId) {
      console.log('No companyId found in session, attempting to fetch from database...');
      
      // Try to get user with company info from database
      const userWithCompany = await db
        .select({
          id: users.id,
          companyId: users.companyId,
          role: users.role
        })
        .from(users)
        .where(eq(users.id, session.user.id!))
        .limit(1);

      if (!userWithCompany[0]?.companyId) {
        return NextResponse.json(
          { error: 'No company associated with user account' },
          { status: 403 }
        );
      }
      
      // Use the companyId from database
      session.user.companyId = userWithCompany[0].companyId;
    }

    console.log(`Fetching interview results for company: ${session.user.companyId}`);

    // Test basic database connection first
    console.log('Testing database connection...');
    try {
      const testConnection = await db.execute(sql`SELECT 1 as test`);
      console.log('Database connection successful:', testConnection);
    } catch (error) {
      console.error('Database connection failed:', error);
              return NextResponse.json(
          { error: 'Database connection failed', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        );
    }

    // Check what tables exist in the database
    console.log('Checking available tables...');
    try {
      const tables = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%candidate%'
        ORDER BY table_name
      `);
      console.log('Available candidate tables:', tables);
    } catch (error) {
      console.error('Error checking tables:', error);
    }

    // Try to query candidate_results table directly with SQL
    console.log('Testing candidate_results table with direct SQL...');
    try {
      const directResults = await db.execute(sql`
        SELECT id, interview_id, status 
        FROM candidate_results 
        LIMIT 5
      `);
      console.log('Direct SQL query successful, found records:', directResults.rows?.length || 0);
      console.log('Sample records:', directResults.rows);
      
      // Check total count and status distribution
      const statusCount = await db.execute(sql`
        SELECT status, COUNT(*) as count 
        FROM candidate_results 
        GROUP BY status
      `);
      console.log('Status distribution:', statusCount.rows);
      
      // Also check if there are any interviews in the main tables
      const interviewCount = await db.execute(sql`
        SELECT 'interview' as table_name, COUNT(*) as count FROM interview
        UNION ALL
        SELECT 'coding_interview' as table_name, COUNT(*) as count FROM coding_interview
      `);
      console.log('Interview tables count:', interviewCount.rows);
      
    } catch (error) {
      console.error('Error with direct SQL query:', error);
      // Don't return error here, continue with the main query using ORM
    }

    // Primary source: candidateResults with proper company filtering
    let completedInterviews;
    try {
      completedInterviews = await db
        .select({
          // Core interview data
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
          candidateId: candidateResults.candidateId,
          applicationId: candidateResults.applicationId,
          
          // Candidate data
          candidateName: candidateUsers.firstName,
          candidateLastName: candidateUsers.lastName,
          candidateEmail: candidateUsers.email,
          
          // Campaign data (if available)
          jobTitle: jobCampaigns.jobTitle,
          campaignName: jobCampaigns.campaignName,
          
          // Direct interview data (if available)
          directInterviewTitle: Interview.jobPosition,
          directInterviewName: Interview.candidateName,
          directInterviewEmail: Interview.candidateEmail,
          directInterviewCompanyId: Interview.companyId,
          
          // Coding interview data (if available)
          codingInterviewTitle: CodingInterview.interviewTopic,
          codingInterviewName: CodingInterview.candidateName,
          codingInterviewEmail: CodingInterview.candidateEmail,
          codingInterviewCompanyId: CodingInterview.companyId,
          programmingLanguage: candidateResults.programmingLanguage
        })
        .from(candidateResults)
        .innerJoin(candidateUsers, eq(candidateResults.candidateId, candidateUsers.id))
        .leftJoin(candidateApplications, eq(candidateResults.applicationId, candidateApplications.id))
        .leftJoin(jobCampaigns, eq(candidateApplications.campaignId, jobCampaigns.id))
        .leftJoin(companies, eq(jobCampaigns.companyId, companies.id))
        .leftJoin(Interview, eq(candidateResults.interviewId, Interview.interviewId))
        .leftJoin(CodingInterview, eq(candidateResults.interviewId, CodingInterview.interviewId))
        .where(and(
          eq(candidateResults.status, 'completed'),
          // Ensure user can only see results from their company
          or(
            eq(companies.id, session.user.companyId), // Campaign interviews
            eq(Interview.companyId, session.user.companyId), // Direct interviews
            eq(CodingInterview.companyId, session.user.companyId) // Direct coding interviews
          )
        ))
        .orderBy(desc(candidateResults.completedAt));
    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json(
        { error: 'Database query failed', details: dbError instanceof Error ? dbError.message : 'Unknown database error' },
        { status: 500 }
      );
    }

    console.log(`Found ${completedInterviews.length} completed Interview in candidateResults`);

    // Process each interview to create unified result structure
    const results = completedInterviews.map((interview) => {
      // Determine if this is a campaign or direct interview
      const isCampaignInterview = !!interview.applicationId;
      const sourceType = isCampaignInterview ? 'campaign' : 'direct';
      
      // Get real candidate data
      const candidateName = interview.candidateName && interview.candidateLastName 
        ? `${interview.candidateName} ${interview.candidateLastName}`.trim()
        : interview.directInterviewName || interview.codingInterviewName || 'Unknown Candidate';
      
      // Get real job title/topic
      const jobTitle = interview.jobTitle || interview.directInterviewTitle || interview.codingInterviewTitle || interview.interviewType || 'Interview';
      
      // Get campaign name or indicate direct interview
      const campaignName = interview.campaignName || 'Direct Interview';

      // Parse answers from feedback
        let answers: any[] = [];
      let totalQuestions = 0;
      let answeredQuestions = 0;
      
      if (interview.feedback) {
        try {
          const feedbackData = JSON.parse(interview.feedback);
          
                if (feedbackData.answers && Array.isArray(feedbackData.answers)) {
            answers = feedbackData.answers;
                } else if (feedbackData.answers && typeof feedbackData.answers === 'object') {
            // Convert object format to array
            answers = Object.values(feedbackData.answers);
                } else if (Array.isArray(feedbackData)) {
            answers = feedbackData;
          }
          
          totalQuestions = answers.length;
          answeredQuestions = answers.filter(a => 
            a.answer || a.userAnswer || a.selectedOption || a.response
          ).length;
          
              } catch (error) {
          console.error(`Error parsing feedback for interview ${interview.interviewId}:`, error);
              answers = [];
        }
      }

      // Calculate performance metrics
      const completionRate = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
      const accuracy = (interview.maxScore && interview.score && interview.maxScore > 0) 
        ? (interview.score / interview.maxScore) * 100 
        : 0;

        return {
          interview: {
          id: interview.historyId,
          interviewId: interview.interviewId,
          candidateName,
          candidateEmail: 'test@example.com', // Fallback for now
          jobPosition: jobTitle,
            interviewType: interview.interviewType,
            completedAt: interview.completedAt,
          duration: interview.duration || 0,
            candidateId: interview.candidateId,
          campaignId: interview.applicationId || interview.interviewId,
          sourceType
          },
          summary: {
            totalQuestions,
          totalAnswered: answeredQuestions,
          averageRating: interview.score || 0,
          totalTimeSpent: interview.duration || 0,
          averageTimePerQuestion: totalQuestions > 0 ? (interview.duration || 0) / totalQuestions : 0,
          performanceMetrics: {
            accuracy,
            averageRating: interview.score || 0,
            timeEfficiency: 85, // Default value
            completionRate
          }
          },
          videoRecordings: {
          fullInterview: null,
          audioRecordings: [],
          hasRecordings: false
        },
        analytics: generateBasicAnalytics(interview.interviewType, answers, {
          score: interview.score || 0,
          maxScore: interview.maxScore || 0,
          completionRate,
          accuracy
        }),
        approvalStatus: interview.passed ? 'approved' : 'pending'
      };
    });

    // Calculate dashboard statistics
    const stats = {
      totalInterviews: results.length,
      averageScore: results.length > 0 ? 
        results.reduce((sum, r) => sum + (r.summary.performanceMetrics.averageRating || 0), 0) / results.length : 0,
      completionRate: results.length > 0 ? 
        results.reduce((sum, r) => sum + r.summary.performanceMetrics.completionRate, 0) / results.length : 0,
      totalCandidates: new Set(results.map(r => r.interview.candidateName)).size
    };

    console.log(`Returning ${results.length} processed interview results`);

    return NextResponse.json({
      results,
      stats,
      pagination: {
        total: results.length,
        page: 1,
        limit: 100
      }
    });

  } catch (error) {
    console.error('Error fetching interview results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch interview results' },
      { status: 500 }
    );
  }
}

// Helper function to generate basic analytics
function generateBasicAnalytics(interviewType: string, answers: any[], metrics: any) {
  const defaultAnalytics = {
    strengths: [] as string[],
    improvements: [] as string[],
    recommendations: [] as string[],
    overallAssessment: '',
    technicalSkills: [] as string[],
    softSkills: [] as string[],
    nextSteps: [] as string[]
  };

  const { score, maxScore, completionRate, accuracy } = metrics;
  const performanceLevel = accuracy >= 70 ? 'good' : accuracy >= 50 ? 'average' : 'needs improvement';

  switch (interviewType) {
    case 'behavioral':
      defaultAnalytics.overallAssessment = `Based on ${answers.length} behavioral questions with ${completionRate.toFixed(1)}% completion rate, candidate shows ${performanceLevel} communication skills.`;
      defaultAnalytics.strengths = performanceLevel === 'good' ? 
        ['Clear communication', 'Relevant examples', 'Good problem-solving approach'] : 
        ['Engagement with questions', 'Willingness to share experiences'];
      defaultAnalytics.softSkills = ['Communication', 'Problem-solving', 'Adaptability'];
      break;
      
    case 'coding':
      defaultAnalytics.overallAssessment = `Based on ${answers.length} coding problems with ${accuracy.toFixed(1)}% accuracy, candidate demonstrates ${performanceLevel} technical skills.`;
      defaultAnalytics.strengths = performanceLevel === 'good' ? 
        ['Strong algorithmic thinking', 'Clean code structure', 'Good problem decomposition'] : 
        ['Basic programming concepts', 'Logical approach to problems'];
      defaultAnalytics.technicalSkills = ['Algorithm design', 'Code implementation', 'Problem solving'];
      break;
      
    case 'mcq':
      defaultAnalytics.overallAssessment = `Based on ${answers.length} multiple choice questions with ${accuracy.toFixed(1)}% accuracy, candidate shows ${performanceLevel} theoretical knowledge.`;
      defaultAnalytics.strengths = performanceLevel === 'good' ? 
        ['Strong theoretical foundation', 'Good knowledge retention'] : 
        ['Basic understanding of concepts'];
      defaultAnalytics.technicalSkills = ['Theoretical knowledge', 'Concept understanding'];
      break;
      
    case 'combo':
      defaultAnalytics.overallAssessment = `Based on ${answers.length} mixed questions, candidate demonstrates balanced technical and soft skills.`;
      defaultAnalytics.strengths = ['Versatile skill set', 'Balanced approach'];
      defaultAnalytics.technicalSkills = ['Programming', 'System thinking'];
      defaultAnalytics.softSkills = ['Communication', 'Adaptability'];
      break;
      
    default:
      defaultAnalytics.overallAssessment = `Interview completed with ${completionRate.toFixed(1)}% completion rate.`;
      defaultAnalytics.strengths = ['Interview participation'];
  }

  // Common recommendations based on performance
  if (performanceLevel === 'needs improvement') {
    defaultAnalytics.improvements = ['Focus on fundamental concepts', 'Practice more examples', 'Improve preparation'];
    defaultAnalytics.recommendations = ['Additional training recommended', 'Consider mentorship program'];
    defaultAnalytics.nextSteps = ['Skills development plan', 'Follow-up assessment'];
  } else if (performanceLevel === 'average') {
    defaultAnalytics.improvements = ['Deepen technical knowledge', 'Practice advanced scenarios'];
    defaultAnalytics.recommendations = ['Continue skill development', 'Focus on specific areas'];
    defaultAnalytics.nextSteps = ['Advanced assessment', 'Specialized training'];
  } else {
    defaultAnalytics.improvements = ['Maintain current level', 'Explore advanced topics'];
    defaultAnalytics.recommendations = ['Ready for next stage', 'Consider leadership opportunities'];
    defaultAnalytics.nextSteps = ['Final interview round', 'Role-specific evaluation'];
  }

  return defaultAnalytics;
}

