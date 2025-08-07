/**
 * Unified Interview Service
 * 
 * Combines scoring, analysis, and flow management into one comprehensive service
 * Handles MCQ, Coding, Behavioral, and Combo interviews for both Direct and Campaign flows
 * Client-side face recognition integration with minimal server load
 */

import { db } from '@/lib/database/connection';
import { candidateResults } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

// =================== INTERFACES ===================

export interface MCQQuestion {
  question: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  correctAnswer: string;
  explanation: string;
  timeLimit?: number;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface CodingQuestion {
  question: string;
  description: string;
  examples: { input: string; output: string; explanation: string }[];
  solution: {
    python?: string;
    typescript?: string;
    php?: string;
  };
  testCases: { input: string; expectedOutput: string }[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface BehavioralQuestion {
  question: string;
  keyPoints: string[];
  category: 'Leadership' | 'Teamwork' | 'Problem-solving' | 'Communication' | 'Adaptability';
  expectedKeywords: string[];
  scoringCriteria: {
    structure: string[];
    specificity: string[];
    impact: string[];
  };
}

export interface QuestionAnswer {
  questionId: string;
  question: any;
  answer: any;
  timeSpent: number;
  questionType: 'mcq' | 'coding' | 'behavioral';
}

export interface InterviewFlow {
  interviewId: string;
  interviewType: 'mcq' | 'coding' | 'behavioral' | 'combo';
  flowType: 'direct' | 'campaign';
  candidateEmail: string;
  questions: any[];
  currentQuestionIndex: number;
  answers: QuestionAnswer[];
  startTime: number;
  endTime?: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
}

export interface InterviewAnalysisResult {
  overallScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  breakdown: {
    [key: string]: {
      score: number;
      maxScore: number;
      percentage: number;
      feedback: string;
      analysis: any;
    };
  };
  summary: {
    strengths: string[];
    improvements: string[];
    recommendations: string[];
    overallFeedback: string;
  };
  timeAnalysis: {
    totalTime: number;
    averageTimePerQuestion: number;
    timeEfficiency: 'excellent' | 'good' | 'fair' | 'poor';
  };
  detailedResults: any[];
  aiInsights: {
    candidateProfile: string;
    skillAssessment: { [skill: string]: number };
    riskFactors: string[];
    confidenceLevel: number;
  };
}

// =================== SCORING FUNCTIONS ===================

export function scoreMCQAnswer(
  question: MCQQuestion,
  submittedAnswer: string,
  timeSpent: number
): {
  isCorrect: boolean;
  score: number;
  maxScore: number;
  timeBonus: number;
  feedback: string;
  analysis: {
    selectedOption: string;
    correctOption: string;
    explanation: string;
  };
} {
  const isCorrect = submittedAnswer === question.correctAnswer;
  const baseScore = isCorrect ? 1 : 0;
  
  let timeBonus = 0;
  const timeLimit = question.timeLimit || 120;
  
  if (isCorrect && timeSpent <= 60) {
    timeBonus = 0.2;
  } else if (isCorrect && timeSpent <= timeLimit * 0.75) {
    timeBonus = 0.1;
  }
  
  const finalScore = baseScore + timeBonus;
  
  const selectedOption = question.options.find(opt => opt.id === submittedAnswer);
  const correctOption = question.options.find(opt => opt.isCorrect);
  
  const feedback = isCorrect 
    ? `Correct! ${question.explanation}${timeBonus > 0 ? ` Great time management (+${Math.round(timeBonus * 100)}% bonus)!` : ''}`
    : `Incorrect. You selected "${selectedOption?.text || 'Unknown'}" but the correct answer is "${correctOption?.text}". ${question.explanation}`;

  return {
    isCorrect,
    score: finalScore,
    maxScore: 1.2,
    timeBonus,
    feedback,
    analysis: {
      selectedOption: selectedOption?.text || 'No answer selected',
      correctOption: correctOption?.text || 'Unknown',
      explanation: question.explanation
    }
  };
}

export function scoreCodingAnswer(
  question: CodingQuestion,
  submittedCode: string,
  language: string,
  timeSpent: number
): {
  score: number;
  maxScore: number;
  breakdown: {
    syntax: number;
    logic: number;
    efficiency: number;
    completeness: number;
    timeManagement: number;
  };
  feedback: string;
  analysis: {
    linesOfCode: number;
    hasMainLogic: boolean;
    syntaxErrors: string[];
    algorithmicApproach: string;
    suggestions: string[];
  };
} {
  const maxScore = 10;
  const breakdown = {
    syntax: 0,
    logic: 0, 
    efficiency: 0,
    completeness: 0,
    timeManagement: 0
  };
  
  // Simplified scoring for demo
  const codeLength = submittedCode.length;
  const hasFunction = /function|def|=>/.test(submittedCode);
  const hasReturn = /return/.test(submittedCode);
  const hasVariables = /let|const|var|=/.test(submittedCode);
  
  // Syntax (2 points)
  breakdown.syntax = hasFunction ? 2 : (codeLength > 20 ? 1 : 0);
  
  // Logic (4 points)
  breakdown.logic = hasReturn && hasVariables ? 4 : (hasFunction ? 2 : 1);
  
  // Efficiency (2 points)
  const nestedLoops = (submittedCode.match(/for|while/g) || []).length;
  breakdown.efficiency = nestedLoops > 2 ? 1 : 2;
  
  // Completeness (1.5 points)
  breakdown.completeness = codeLength > 50 && hasReturn ? 1.5 : 1;
  
  // Time Management (0.5 points)
  const timeLimit = question.difficulty === 'Easy' ? 900 : question.difficulty === 'Medium' ? 1800 : 2700;
  breakdown.timeManagement = timeSpent <= timeLimit ? 0.5 : 0.25;
  
  const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);
  
  const feedback = `Code Analysis: ${Math.round((totalScore / maxScore) * 100)}%`;
  
  const analysis = {
    linesOfCode: submittedCode.split('\n').filter(line => line.trim().length > 0).length,
    hasMainLogic: hasFunction && hasReturn,
    syntaxErrors: hasFunction ? [] : ['Missing function definition'],
    algorithmicApproach: hasFunction ? 'Function-based solution' : 'Basic code structure',
    suggestions: totalScore < 8 ? ['Review algorithm design', 'Add proper error handling'] : []
  };
  
  return {
    score: Math.round(totalScore * 100) / 100,
    maxScore,
    breakdown,
    feedback,
    analysis
  };
}

export function scoreBehavioralAnswer(
  question: BehavioralQuestion,
  submittedAnswer: string,
  timeSpent: number
): {
  score: number;
  maxScore: number;
  breakdown: {
    structure: number;
    specificity: number;
    relevance: number;
    impact: number;
    communication: number;
  };
  feedback: string;
  analysis: {
    wordCount: number;
    keywordMatches: string[];
    starMethodScore: number;
    specificityScore: number;
    impactMentioned: boolean;
    suggestions: string[];
  };
} {
  const maxScore = 5;
  const breakdown = {
    structure: 0,
    specificity: 0,
    relevance: 0,
    impact: 0,
    communication: 0
  };
  
  const lowerAnswer = submittedAnswer.toLowerCase();
  const wordCount = submittedAnswer.split(/\s+/).filter(word => word.length > 0).length;
  
  // Structure (STAR Method - 1 point)
  const starWords = ['situation', 'task', 'action', 'result'];
  const starCount = starWords.filter(word => lowerAnswer.includes(word)).length;
  breakdown.structure = starCount >= 3 ? 1 : starCount * 0.33;
  
  // Specificity (1 point)
  const hasNumbers = /\d+/.test(submittedAnswer);
  const hasTimeline = /week|month|day|year/.test(lowerAnswer);
  breakdown.specificity = (hasNumbers ? 0.5 : 0) + (hasTimeline ? 0.5 : 0);
  
  // Relevance (1 point)
  const keywordMatches = question.expectedKeywords.filter(keyword => 
    lowerAnswer.includes(keyword.toLowerCase())
  );
  breakdown.relevance = Math.min(1, keywordMatches.length * 0.25);
  
  // Impact (1 point)
  const impactWords = ['improved', 'increased', 'achieved', 'successful', 'resolved'];
  const hasImpact = impactWords.some(word => lowerAnswer.includes(word));
  breakdown.impact = hasImpact ? 1 : 0.5;
  
  // Communication (1 point)
  if (wordCount < 50) breakdown.communication = 0.5;
  else if (wordCount > 300) breakdown.communication = 0.8;
  else breakdown.communication = 1;
  
  const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);
  const percentage = Math.round((totalScore / maxScore) * 100);
  
  const feedback = `Behavioral Response: ${percentage}%`;
  
  const analysis = {
    wordCount,
    keywordMatches,
    starMethodScore: breakdown.structure,
    specificityScore: breakdown.specificity,
    impactMentioned: hasImpact,
    suggestions: totalScore < 4 ? ['Use STAR method', 'Add specific examples', 'Mention quantifiable results'] : []
  };
  
  return {
    score: Math.round(totalScore * 100) / 100,
    maxScore,
    breakdown,
    feedback,
    analysis
  };
}

// =================== UNIFIED INTERVIEW SERVICE ===================

export class UnifiedInterviewService {
  
  // =================== FLOW MANAGEMENT ===================
  
  static async initializeInterviewFlow(
    interviewId: string,
    candidateEmail: string,
    interviewType: 'mcq' | 'coding' | 'behavioral' | 'combo',
    flowType: 'direct' | 'campaign' = 'direct'
  ): Promise<InterviewFlow> {
    const questions = await this.loadQuestionsForInterview(interviewId, interviewType, flowType);
    
    return {
      interviewId,
      interviewType,
      flowType,
      candidateEmail,
      questions,
      currentQuestionIndex: 0,
      answers: [],
      startTime: Date.now(),
      status: 'not_started'
    };
  }

  private static async loadQuestionsForInterview(
    interviewId: string,
    interviewType: 'mcq' | 'coding' | 'behavioral' | 'combo',
    flowType: 'direct' | 'campaign'
  ): Promise<any[]> {
    try {
      if (flowType === 'direct') {
        // Load from direct interview tables
        const response = await fetch(`/api/interview/${interviewId}`);
        const data = await response.json();
        if (data.success && data.interview?.questions) {
          return this.filterQuestionsByType(data.interview.questions, interviewType);
        }
      } else {
        // Load from campaign setup
        const response = await fetch(`/api/campaigns/interview/${interviewId}`);
        const data = await response.json();
        if (data.success && data.questions) {
          return this.filterQuestionsByType(data.questions, interviewType);
        }
      }
      
      // Fallback to default questions
      return this.generateDefaultQuestions(interviewType);
    } catch (error) {
      console.error('Error loading questions:', error);
      return this.generateDefaultQuestions(interviewType);
    }
  }

  private static filterQuestionsByType(questions: any[], interviewType: string): any[] {
    if (interviewType === 'combo') return questions; // Return all for combo
    return questions.filter((q: any) => 
      q.type === interviewType || 
      q.questionType === interviewType ||
      q.category === interviewType
    );
  }

  private static generateDefaultQuestions(interviewType: string): any[] {
    switch (interviewType) {
      case 'mcq':
        return [{
          id: 1,
          type: 'mcq',
          question: 'What is the time complexity of binary search?',
          options: [
            { id: 'a', text: 'O(n)', isCorrect: false },
            { id: 'b', text: 'O(log n)', isCorrect: true },
            { id: 'c', text: 'O(n log n)', isCorrect: false },
            { id: 'd', text: 'O(n²)', isCorrect: false }
          ],
          correctAnswer: 'b',
          explanation: 'Binary search divides the search space in half with each iteration.',
          category: 'Algorithms',
          difficulty: 'medium'
        }];
      
      case 'coding':
        return [{
          id: 1,
          type: 'coding',
          question: 'Two Sum Problem',
          description: 'Given an array of integers and a target sum, return indices of two numbers that add up to the target.',
          examples: [{ input: '[2,7,11,15], target=9', output: '[0,1]', explanation: '2 + 7 = 9' }],
          testCases: [
            { input: '[2,7,11,15], 9', expectedOutput: '[0,1]' },
            { input: '[3,2,4], 6', expectedOutput: '[1,2]' }
          ],
          difficulty: 'Easy',
          solution: {
            javascript: 'function twoSum(nums, target) { /* solution */ }'
          }
        }];
      
      case 'behavioral':
        return [{
          id: 1,
          type: 'behavioral',
          question: 'Tell me about a challenging project you worked on.',
          category: 'Problem-solving',
          keyPoints: ['Challenge description', 'Actions taken', 'Results achieved'],
          expectedKeywords: ['project', 'challenge', 'solution', 'result', 'team'],
          scoringCriteria: {
            structure: ['situation', 'task', 'action', 'result'],
            specificity: ['specific example', 'detailed actions'],
            impact: ['positive outcome', 'lessons learned']
          }
        }];
      
      case 'combo':
        return [
          ...this.generateDefaultQuestions('mcq'),
          ...this.generateDefaultQuestions('coding'),
          ...this.generateDefaultQuestions('behavioral')
        ];
      
      default:
        return [];
    }
  }

  static submitAnswer(flow: InterviewFlow, questionId: string, answer: any, timeSpent: number): InterviewFlow {
    const questionAnswer: QuestionAnswer = {
      questionId,
      question: flow.questions[flow.currentQuestionIndex],
      answer,
      timeSpent,
      questionType: flow.questions[flow.currentQuestionIndex].type || 
                   flow.questions[flow.currentQuestionIndex].questionType || 
                   'mcq'
    };

    const updatedFlow = {
      ...flow,
      answers: [...flow.answers, questionAnswer],
      currentQuestionIndex: flow.currentQuestionIndex + 1,
      status: (flow.currentQuestionIndex + 1 >= flow.questions.length) 
        ? 'completed' as const
        : 'in_progress' as const
    };

    if (updatedFlow.status === 'completed') {
      updatedFlow.endTime = Date.now();
    }

    return updatedFlow;
  }

  static getCurrentQuestion(flow: InterviewFlow): any | null {
    if (flow.currentQuestionIndex >= flow.questions.length) {
      return null;
    }
    return flow.questions[flow.currentQuestionIndex];
  }

  static getProgress(flow: InterviewFlow) {
    const timeElapsed = flow.endTime ? 
      flow.endTime - flow.startTime : 
      Date.now() - flow.startTime;

    return {
      current: flow.currentQuestionIndex + 1,
      total: flow.questions.length,
      percentage: Math.round(((flow.currentQuestionIndex + 1) / flow.questions.length) * 100),
      timeElapsed: Math.round(timeElapsed / 1000)
    };
  }

  // =================== ANALYSIS AND SCORING ===================

  static async analyzeInterview(
    interviewId: string,
    candidateEmail: string,
    questionsAndAnswers: QuestionAnswer[]
  ): Promise<InterviewAnalysisResult> {
    const detailedResults: any[] = [];
    const breakdown: InterviewAnalysisResult['breakdown'] = {};
    let totalScore = 0;
    let totalMaxScore = 0;
    let totalTime = 0;

    // Process each question-answer pair
    for (const qa of questionsAndAnswers) {
      const result = await this.analyzeQuestionAnswer(qa);
      detailedResults.push(result);
      
      totalScore += result.score;
      totalMaxScore += result.maxScore;
      totalTime += qa.timeSpent;

      // Group by question type
      if (!breakdown[qa.questionType]) {
        breakdown[qa.questionType] = {
          score: 0,
          maxScore: 0,
          percentage: 0,
          feedback: '',
          analysis: { questions: [], averageScore: 0 }
        };
      }

      breakdown[qa.questionType].score += result.score;
      breakdown[qa.questionType].maxScore += result.maxScore;
      breakdown[qa.questionType].analysis.questions.push(result);
    }

    // Calculate percentages for each type
    Object.keys(breakdown).forEach(type => {
      const section = breakdown[type];
      section.percentage = section.maxScore > 0 ? (section.score / section.maxScore) * 100 : 0;
      section.analysis.averageScore = section.analysis.questions.length > 0
        ? section.score / section.analysis.questions.length
        : 0;
      section.feedback = this.generateSectionFeedback(type, section.percentage);
    });

    const percentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
    const passed = percentage >= 60;

    const summary = this.generateSummary(breakdown, percentage);
    const timeAnalysis = this.analyzeTimeEfficiency(totalTime, questionsAndAnswers.length);
    const aiInsights = this.generateAIInsights(breakdown);

    const analysisResult: InterviewAnalysisResult = {
      overallScore: totalScore,
      maxScore: totalMaxScore,
      percentage: Math.round(percentage * 100) / 100,
      passed,
      breakdown,
      summary,
      timeAnalysis,
      detailedResults,
      aiInsights
    };

    await this.saveAnalysisToDatabase(interviewId, candidateEmail, analysisResult);
    return analysisResult;
  }

  private static async analyzeQuestionAnswer(qa: QuestionAnswer): Promise<any> {
    switch (qa.questionType) {
      case 'mcq':
        return this.analyzeMCQAnswer(qa);
      case 'coding':
        return this.analyzeCodingAnswer(qa);
      case 'behavioral':
        return this.analyzeBehavioralAnswer(qa);
      default:
        throw new Error(`Unsupported question type: ${qa.questionType}`);
    }
  }

  private static analyzeMCQAnswer(qa: QuestionAnswer) {
    const question: MCQQuestion = qa.question;
    const result = scoreMCQAnswer(question, qa.answer, qa.timeSpent);
    
    return {
      questionId: qa.questionId,
      questionType: 'mcq',
      question: question.question,
      correctAnswer: question.correctAnswer,
      submittedAnswer: qa.answer,
      ...result,
      timeSpent: qa.timeSpent,
      category: question.category || 'General',
      difficulty: question.difficulty || 'medium'
    };
  }

  private static analyzeCodingAnswer(qa: QuestionAnswer) {
    const question: CodingQuestion = qa.question;
    const code = qa.answer.code || qa.answer;
    const language = qa.answer.language || 'javascript';
    const result = scoreCodingAnswer(question, code, language, qa.timeSpent);
    
    return {
      questionId: qa.questionId,
      questionType: 'coding',
      question: question.question,
      submittedCode: code,
      language,
      ...result,
      timeSpent: qa.timeSpent,
      difficulty: question.difficulty
    };
  }

  private static analyzeBehavioralAnswer(qa: QuestionAnswer) {
    const question: BehavioralQuestion = qa.question;
    const answer = qa.answer.text || qa.answer;
    const result = scoreBehavioralAnswer(question, answer, qa.timeSpent);
    
    return {
      questionId: qa.questionId,
      questionType: 'behavioral',
      question: question.question,
      submittedAnswer: answer,
      ...result,
      timeSpent: qa.timeSpent,
      category: question.category
    };
  }

  private static generateSectionFeedback(type: string, percentage: number): string {
    if (percentage >= 90) return `Excellent ${type} performance! Outstanding understanding and execution.`;
    if (percentage >= 80) return `Strong ${type} skills demonstrated with room for minor improvements.`;
    if (percentage >= 70) return `Good ${type} foundation with some areas needing development.`;
    if (percentage >= 60) return `Basic ${type} competency shown, significant improvement needed.`;
    return `${type} skills require substantial development and practice.`;
  }

  private static generateSummary(
    breakdown: InterviewAnalysisResult['breakdown'],
    percentage: number
  ): InterviewAnalysisResult['summary'] {
    const strengths: string[] = [];
    const improvements: string[] = [];
    const recommendations: string[] = [];

    Object.keys(breakdown).forEach(type => {
      const section = breakdown[type];
      if (section.percentage >= 80) {
        strengths.push(`Strong ${type} skills (${section.percentage.toFixed(1)}%)`);
      } else if (section.percentage < 60) {
        improvements.push(`${type} skills need improvement (${section.percentage.toFixed(1)}%)`);
      }
    });

    if (breakdown.mcq && breakdown.mcq.percentage < 70) {
      recommendations.push('Review fundamental concepts and practice more MCQ questions');
    }
    if (breakdown.coding && breakdown.coding.percentage < 70) {
      recommendations.push('Practice coding problems and focus on algorithm optimization');
    }
    if (breakdown.behavioral && breakdown.behavioral.percentage < 70) {
      recommendations.push('Prepare structured responses using the STAR method');
    }

    let overallFeedback = '';
    if (percentage >= 85) overallFeedback = 'Exceptional candidate with strong technical and soft skills. Highly recommended.';
    else if (percentage >= 75) overallFeedback = 'Strong candidate with good overall performance. Minor areas for development.';
    else if (percentage >= 65) overallFeedback = 'Decent candidate with potential. Some skill gaps that could be addressed.';
    else if (percentage >= 50) overallFeedback = 'Below average performance. Significant development needed.';
    else overallFeedback = 'Poor performance across multiple areas. Not recommended for the current position.';

    return { strengths, improvements, recommendations, overallFeedback };
  }

  private static analyzeTimeEfficiency(totalTime: number, questionCount: number) {
    const averageTimePerQuestion = questionCount > 0 ? totalTime / questionCount : 0;
    const totalMinutes = totalTime / 60;

    let timeEfficiency: 'excellent' | 'good' | 'fair' | 'poor';
    if (averageTimePerQuestion < 120) timeEfficiency = 'excellent';
    else if (averageTimePerQuestion < 240) timeEfficiency = 'good';
    else if (averageTimePerQuestion < 360) timeEfficiency = 'fair';
    else timeEfficiency = 'poor';

    return {
      totalTime: totalMinutes,
      averageTimePerQuestion: averageTimePerQuestion / 60,
      timeEfficiency
    };
  }

  private static generateAIInsights(breakdown: InterviewAnalysisResult['breakdown']) {
    let candidateProfile = 'Balanced candidate';
    if (breakdown.coding && breakdown.coding.percentage > 80) {
      candidateProfile = 'Technical specialist with strong coding skills';
    } else if (breakdown.behavioral && breakdown.behavioral.percentage > 80) {
      candidateProfile = 'Strong communicator with excellent soft skills';
    } else if (breakdown.mcq && breakdown.mcq.percentage > 80) {
      candidateProfile = 'Knowledge-focused candidate with good theoretical understanding';
    }

    const skillAssessment: { [skill: string]: number } = {};
    if (breakdown.coding) {
      skillAssessment['Programming'] = breakdown.coding.percentage;
      skillAssessment['Problem Solving'] = breakdown.coding.percentage * 0.9;
      skillAssessment['Algorithm Design'] = breakdown.coding.percentage * 0.8;
    }
    if (breakdown.behavioral) {
      skillAssessment['Communication'] = breakdown.behavioral.percentage;
      skillAssessment['Leadership'] = breakdown.behavioral.percentage * 0.7;
      skillAssessment['Teamwork'] = breakdown.behavioral.percentage * 0.8;
    }
    if (breakdown.mcq) {
      skillAssessment['Technical Knowledge'] = breakdown.mcq.percentage;
      skillAssessment['Domain Expertise'] = breakdown.mcq.percentage * 0.9;
    }

    const riskFactors: string[] = [];
    Object.keys(breakdown).forEach(type => {
      if (breakdown[type].percentage < 50) {
        riskFactors.push(`Very low ${type} performance may indicate skill gaps`);
      }
    });

    const scores = Object.values(breakdown).map(b => b.percentage);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const confidenceLevel = Math.max(0, Math.min(100, 100 - variance));

    return { candidateProfile, skillAssessment, riskFactors, confidenceLevel };
  }

  private static async saveAnalysisToDatabase(
    interviewId: string,
    candidateEmail: string,
    analysisResult: InterviewAnalysisResult
  ): Promise<void> {
    try {
      const existingResult = await db
        .select()
        .from(candidateResults)
        .where(eq(candidateResults.interviewId, interviewId))
        .limit(1);

      const resultData = {
        interviewId,
        score: Math.round(analysisResult.overallScore),
        maxScore: analysisResult.maxScore,
        passed: analysisResult.passed,
        completedAt: new Date(),
        status: 'completed',
        detailedAnalysis: analysisResult,
        scoreBreakdown: analysisResult.breakdown,
        feedback: analysisResult.summary.overallFeedback,
        updatedAt: new Date()
      };

      if (existingResult.length > 0) {
        await db.update(candidateResults).set(resultData).where(eq(candidateResults.id, existingResult[0].id));
      } else {
        await db.insert(candidateResults).values({
          ...resultData,
          candidateId: '',
          interviewType: 'combo',
          roundNumber: 1,
          createdAt: new Date()
        });
      }

      console.log(`✅ Analysis results saved for interview ${interviewId}`);
    } catch (error) {
      console.error('Error saving analysis results:', error);
    }
  }

  static async getAnalysisResults(interviewId: string): Promise<InterviewAnalysisResult | null> {
    try {
      const result = await db
        .select()
        .from(candidateResults)
        .where(eq(candidateResults.interviewId, interviewId))
        .limit(1);

      return result.length > 0 ? result[0].detailedAnalysis as InterviewAnalysisResult : null;
    } catch (error) {
      console.error('Error fetching analysis results:', error);
      return null;
    }
  }

  static async completeInterview(flow: InterviewFlow): Promise<InterviewAnalysisResult> {
    if (flow.status !== 'completed') {
      throw new Error('Interview is not completed yet');
    }

    return await this.analyzeInterview(flow.interviewId, flow.candidateEmail, flow.answers);
  }
}