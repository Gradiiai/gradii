import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database/connection';
import { candidateResults, 
  candidateUsers,
  candidateApplications,
  jobCampaigns,
  companies, Interview,
  CodingInterview } from '@/lib/database/schema';
import { eq, and, or, sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    console.log(`Fetching individual interview results for ID: ${id}, Company: ${session.user.companyId}`);

    // Primary approach: Look in candidateResults with proper company access control
    const interviewResults = await db
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
        programmingLanguage: candidateResults.programmingLanguage,
        
        // Candidate info
        candidateId: candidateUsers.id,
        candidateName: sql<string>`CONCAT(${candidateUsers.firstName}, ' ', COALESCE(${candidateUsers.lastName}, ''))`,
        candidateEmail: candidateUsers.email,
        
        // Campaign info (for campaign-based interviews)
        applicationId: candidateResults.applicationId,
        campaignId: jobCampaigns.id,
        campaignName: jobCampaigns.campaignName,
        jobTitle: jobCampaigns.jobTitle,
        companyName: companies.name,
        
        // Direct interview info
        directInterviewTitle: sql<string>`COALESCE(${Interview.jobPosition}, ${CodingInterview.interviewTopic})`,
        directInterviewCompanyId: sql<string>`COALESCE(${Interview.companyId}, ${CodingInterview.companyId})`,
        directInterviewName: sql<string>`COALESCE(${Interview.candidateName}, ${CodingInterview.candidateName})`,
        directInterviewEmail: sql<string>`COALESCE(${Interview.candidateEmail}, ${CodingInterview.candidateEmail})`,
        directProgrammingLanguage: CodingInterview.programmingLanguage,
        directDifficultyLevel: CodingInterview.difficultyLevel
      })
      .from(candidateResults)
      .innerJoin(candidateUsers, eq(candidateResults.candidateId, candidateUsers.id))
      .leftJoin(candidateApplications, eq(candidateResults.applicationId, candidateApplications.id))
      .leftJoin(jobCampaigns, eq(candidateApplications.campaignId, jobCampaigns.id))
      .leftJoin(companies, eq(jobCampaigns.companyId, companies.id))
      .leftJoin(Interview, eq(candidateResults.interviewId, Interview.interviewId))
      .leftJoin(CodingInterview, eq(candidateResults.interviewId, CodingInterview.interviewId))
      .where(and(
        or(
          eq(candidateResults.id, id),
          eq(candidateResults.interviewId, id)
        ),
        eq(candidateResults.status, 'completed'),
        // Ensure user can only see results from their company
        or(
          eq(companies.id, session.user.companyId), // Campaign interviews
          eq(Interview.companyId, session.user.companyId), // Direct interviews
          eq(CodingInterview.companyId, session.user.companyId) // Direct coding interviews
        )
      ))
      .limit(1);

    if (interviewResults.length === 0) {
      console.log(`No interview found in candidateResults for ID: ${id}`);
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    const historyRecord = interviewResults[0];
    console.log(`Found interview: ${historyRecord.interviewType} (${historyRecord.interviewId})`);

    // Determine interview source and get correct metadata
    const isCampaignInterview = !!historyRecord.applicationId;
    const candidateName = historyRecord.candidateName || historyRecord.directInterviewName || 'Unknown Candidate';
    const candidateEmail = historyRecord.candidateEmail || historyRecord.directInterviewEmail;
    const jobTitle = historyRecord.jobTitle || historyRecord.directInterviewTitle || 'Interview';
    const programmingLanguage = historyRecord.programmingLanguage || historyRecord.directProgrammingLanguage;
    const difficultyLevel = historyRecord.directDifficultyLevel;

    // Parse answers from feedback field
    let answers: any[] = [];
    let detailedAnswers: any[] = [];
    
    if (historyRecord.feedback) {
      try {
        const parsed = JSON.parse(historyRecord.feedback);
        console.log(`Parsing feedback for interview ${historyRecord.interviewId}:`, typeof parsed);
        
        // Handle different feedback structures
        if (parsed.answers && Array.isArray(parsed.answers)) {
          // New structure with detailed answers array
          detailedAnswers = parsed.answers;
        } else if (parsed.answers && typeof parsed.answers === 'object') {
          // Object format with numeric keys - convert to array
          const keys = Object.keys(parsed.answers).sort((a, b) => Number(a) - Number(b));
          detailedAnswers = keys.map(key => ({
            ...parsed.answers[key],
            questionIndex: Number(key),
            // Preserve the answer in multiple formats for compatibility
            userAnswer: parsed.answers[key].userAnswer || parsed.answers[key].answer || parsed.answers[key]
          }));
        } else if (Array.isArray(parsed)) {
          // Direct array format
          detailedAnswers = parsed;
        } else if (typeof parsed === 'object') {
          // Handle legacy formats or single answer objects
          const keys = Object.keys(parsed).filter(key => !isNaN(Number(key)));
          if (keys.length > 0) {
            // Multiple answers stored as object with numeric keys
            detailedAnswers = keys.sort((a, b) => Number(a) - Number(b)).map(key => ({
              questionIndex: Number(key),
              userAnswer: parsed[key],
              answer: parsed[key] // Keep both formats
            }));
          } else {
            // Check for other common structures
            const possibleAnswerKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
            const foundKeys = possibleAnswerKeys.filter(key => parsed.hasOwnProperty(key));
            
            if (foundKeys.length > 0) {
              detailedAnswers = foundKeys.map(key => ({
                questionIndex: Number(key),
                userAnswer: parsed[key],
                answer: parsed[key]
              }));
            } else {
              // Single answer or unknown structure
              console.log('Feedback structure analysis:', {
                keys: Object.keys(parsed),
                hasAnswers: !!parsed.answers,
                isArray: Array.isArray(parsed),
                type: typeof parsed
              });
              
              // If it looks like a single answer, treat it as such
              if (parsed.userAnswer || parsed.answer || parsed.response) {
                detailedAnswers = [parsed];
              } else {
                console.warn('Unknown feedback structure:', parsed);
                detailedAnswers = [];
              }
            }
          }
        }

        // Get original interview questions to supplement missing data
        let originalQuestions: any[] = [];
        try {
          // Try to get questions from the original interview
          const interviewQuery = await db
            .select({
              interviewQuestions: historyRecord.interviewType === 'coding' ? CodingInterview.codingQuestions : Interview.interviewQuestions
            })
            .from(historyRecord.interviewType === 'coding' ? CodingInterview : Interview)
            .where(eq(historyRecord.interviewType === 'coding' ? CodingInterview.interviewId : Interview.interviewId, historyRecord.interviewId))
            .limit(1);
          
          if (interviewQuery.length > 0) {
            const questionsData = interviewQuery[0].interviewQuestions;
            if (questionsData) {
              originalQuestions = typeof questionsData === 'string' ? JSON.parse(questionsData) : questionsData;
            }
          }
        } catch (error) {
          console.error('Error fetching original interview questions:', error);
        }

        // Normalize answer structure
        answers = detailedAnswers.map((answer: any, index: number) => {
          // Try to get the question from multiple sources
          let questionText = answer.question || answer.questionText || answer.problemDescription;
          
          // If no question found in answer, try to get from original questions
          if (!questionText || questionText === 'Question NaN' || questionText.startsWith('Question ')) {
            if (originalQuestions[index]) {
              questionText = originalQuestions[index].question || 
                           originalQuestions[index].Question || 
                           originalQuestions[index].problemDescription ||
                           originalQuestions[index].title ||
                           `Question ${index + 1}`;
            } else {
              questionText = `Question ${index + 1}`;
            }
          }

          // Get the original question data for options
          let questionOptions = [];
          let originalQuestion = null;
          if (originalQuestions[index]) {
            originalQuestion = originalQuestions[index];
            questionOptions = originalQuestion.options || originalQuestion.choices || [];
          }

          // Format user answer to show full option text
          let formattedUserAnswer = answer.userAnswer || answer.selectedOption || answer.answer || answer.response || answer.code || 'No answer provided';
          let formattedCorrectAnswer = answer.correctAnswer || answer.correctOption;
          
          // If it's an MCQ and we have options, format the answers
          if (questionOptions.length > 0 && typeof formattedUserAnswer === 'string') {
            // Try to match user answer to option
            const userOptionIndex = parseInt(formattedUserAnswer) - 1; // Convert 1-based to 0-based
            const userOptionLetter = formattedUserAnswer.toLowerCase();
            
            if (!isNaN(userOptionIndex) && questionOptions[userOptionIndex]) {
              formattedUserAnswer = `${formattedUserAnswer}. ${questionOptions[userOptionIndex]}`;
            } else if (['a', 'b', 'c', 'd', 'e'].includes(userOptionLetter)) {
              const letterIndex = userOptionLetter.charCodeAt(0) - 97; // Convert a-e to 0-4
              if (questionOptions[letterIndex]) {
                formattedUserAnswer = `${formattedUserAnswer.toUpperCase()}. ${questionOptions[letterIndex]}`;
              }
            }
            
            // Format correct answer similarly
            if (formattedCorrectAnswer) {
              const correctOptionIndex = parseInt(formattedCorrectAnswer) - 1;
              const correctOptionLetter = formattedCorrectAnswer.toLowerCase();
              
              if (!isNaN(correctOptionIndex) && questionOptions[correctOptionIndex]) {
                formattedCorrectAnswer = `${formattedCorrectAnswer}. ${questionOptions[correctOptionIndex]}`;
              } else if (['a', 'b', 'c', 'd', 'e'].includes(correctOptionLetter)) {
                const letterIndex = correctOptionLetter.charCodeAt(0) - 97;
                if (questionOptions[letterIndex]) {
                  formattedCorrectAnswer = `${formattedCorrectAnswer.toUpperCase()}. ${questionOptions[letterIndex]}`;
                }
              }
            }
          }

          return {
            id: answer.id || (index + 1).toString(),
            question: questionText,
            questionOptions: questionOptions,
            userAnswer: formattedUserAnswer,
            correctAnswer: formattedCorrectAnswer,
            isCorrect: answer.isCorrect !== undefined ? answer.isCorrect : undefined,
            rating: answer.rating || answer.score || undefined,
            feedback: answer.feedback || answer.aiAnalysis || answer.aiExplanation || undefined,
            language: answer.language || answer.programmingLanguage || programmingLanguage || undefined,
            type: answer.type || historyRecord.interviewType || 'behavioral',
            timeSpent: answer.timeSpent || answer.timeTaken || undefined,
            scoringBreakdown: answer.scoringBreakdown || undefined,
            maxScore: answer.maxScore || 1,
            difficulty: answer.difficulty || difficultyLevel || undefined,
            testCases: answer.testCases || undefined,
            codeOutput: answer.codeOutput || answer.output || undefined
          };
        });
        
        console.log(`Processed ${answers.length} detailed answers for interview ${historyRecord.interviewId}`);
      } catch (e) {
        console.error('Error parsing interview feedback:', e);
        answers = [];
      }
    }

    // Calculate summary metrics
    const totalQuestions = answers.length;
    const totalAnswered = answers.filter(a => {
      const val = a.userAnswer || a.answer || a.selectedOption || a.response || a.code;
      if (val === undefined || val === null) return false;
      if (typeof val === 'string') return val.trim() !== '' && val !== 'No answer provided';
      // allow numbers/objects as answered
      return true;
    }).length;
    const completionRate = totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0;
    const accuracy = (historyRecord.maxScore && historyRecord.score && historyRecord.maxScore > 0) 
      ? Math.round((historyRecord.score / historyRecord.maxScore) * 100) 
      : 0;

    // Calculate average time per question
    const answersWithTime = answers.filter(a => a.timeSpent && a.timeSpent > 0);
    const averageTimePerQuestion = answersWithTime.length > 0 
      ? answersWithTime.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / answersWithTime.length 
      : 0;

    // Generate analytics
    const analytics = {
      questionTypes: answers.reduce((types: any, answer: any) => {
        const type = answer.type || 'unknown';
        types[type] = (types[type] || 0) + 1;
        return types;
      }, {}),
      correctAnswers: answers.filter(a => a.isCorrect === true).length,
      incorrectAnswers: answers.filter(a => a.isCorrect === false).length,
      averageRating: (() => {
        const answersWithRating = answers.filter(a => a.rating && a.rating > 0);
        return answersWithRating.length > 0 
          ? answersWithRating.reduce((sum, a) => sum + (a.rating || 0), 0) / answersWithRating.length 
          : 0;
      })(),
      programmingLanguages: answers
        .filter(a => a.language)
        .reduce((langs: any, answer: any) => {
          langs[answer.language] = (langs[answer.language] || 0) + 1;
          return langs;
        }, {}),
      difficultyDistribution: answers
        .filter(a => a.difficulty)
        .reduce((diff: any, answer: any) => {
          diff[answer.difficulty] = (diff[answer.difficulty] || 0) + 1;
          return diff;
        }, {})
    };

    const results = {
      interview: {
        id: historyRecord.historyId,
        interviewId: historyRecord.interviewId,
        type: historyRecord.interviewType,
        title: `${jobTitle} - ${historyRecord.interviewType} Interview`,
        candidateEmail,
        candidateName,
        status: historyRecord.status,
        score: historyRecord.score,
        maxScore: historyRecord.maxScore,
        completedAt: historyRecord.completedAt,
        startedAt: historyRecord.startedAt,
        duration: historyRecord.duration,
        passed: historyRecord.passed,
        programmingLanguage,
        difficultyLevel,
        sourceType: isCampaignInterview ? 'campaign' : 'direct',
        campaignName: historyRecord.campaignName || 'Direct Interview',
        answers: answers
      },
      answers: answers,
      summary: {
        totalQuestions,
        totalAnswered,
        score: historyRecord.score || 0,
        maxScore: historyRecord.maxScore || 0,
        completionRate,
        averageTimePerQuestion,
        totalTimeSpent: historyRecord.duration || 0,
        accuracy,
        performanceLevel: accuracy >= 70 ? 'good' : accuracy >= 50 ? 'average' : 'needs improvement'
      },
      analytics
    };

    console.log(`Returning detailed results for interview ${historyRecord.interviewId} with ${answers.length} answers`);
    return NextResponse.json(results);

  } catch (error) {
    console.error('Error fetching individual interview results:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}