import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("OPENAI_API_KEY is not set");
}

const openai = new OpenAI({ apiKey });
const MODEL = "gpt-4o"; // or "gpt-4o-mini" if available in your tier

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Check if this is topic-based (question bank) or job-based (standalone interview)
    const topic = formData.get("topic") as string;
    const jobPosition = formData.get("jobPosition") as string;
    const jobDescription = formData.get("jobDescription") as string;
    const yearsOfExperience = formData.get("yearsOfExperience") as string;
    const resumeText = formData.get("resumeText") as string;
    const codingQuestions = parseInt(formData.get("coding") as string) || 2;
    const behavioralQuestions = parseInt(formData.get("behavioral") as string) || 2;
    const mcqQuestions = parseInt(formData.get("mcq") as string) || 2;

    let prompt: string;
    
    if (topic) {
      // Question bank mode - topic-based generation
      prompt = `Generate a combination of interview questions related to the topic: "${topic}".

Generate exactly:
- ${codingQuestions} coding questions
- ${behavioralQuestions} behavioral questions  
- ${mcqQuestions} multiple-choice questions

Format the response as a JSON object with three arrays:
{
  "coding": [
    {
      "title": "Question title",
      "description": "Problem description",
      "examples": [{"input": "example input", "output": "expected output", "explanation": "why this output"}],
      "difficulty": "Easy | Medium | Hard",
      "constraints": ["constraint 1", "constraint 2"],
      "hints": ["hint 1", "hint 2"],
      "solutions": {
        "javascript": "function solution() {\\n    // Complete solution with proper code formatting\\n}",
        "python": "def solution():\\n    # Complete solution with proper code formatting\\n    pass",
        "typescript": "function solution(): any {\\n    // Complete solution with proper code formatting\\n}"
      },
      "explanation": "Detailed explanation of the solution approach"
    }
  ],
  "behavioral": [
    {
      "question": "Tell me about a time when...",
      "purpose": "To assess specific skills",
      "keyPoints": ["Point 1", "Point 2"],
      "followUpQuestions": ["Follow-up 1"],
      "difficulty": "Easy | Medium | Hard",
      "category": "Leadership | Teamwork | Problem-solving",
      "tips": "Tips for answering"
    }
  ],
  "mcq": [
    {
      "question": "Question text?",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": 0,
      "explanation": "Why this is correct",
      "difficulty": "Easy | Medium | Hard",
      "category": "Technical category",
      "timeEstimate": "2 minutes"
    }
  ]
}

IMPORTANT: For MCQ questions, provide options as a simple array of strings WITHOUT letter prefixes (A), B), etc.). The correctAnswer should be the index (0-3) of the correct option.

Generate the questions now:`;
    } else if (jobPosition && jobDescription) {
      // Standalone interview mode - job-based generation
      prompt = `Generate a comprehensive interview question set for a ${jobPosition} role:
- Job Description: ${jobDescription}
- Experience Level: ${yearsOfExperience || "Not specified"}
- Resume Context: ${resumeText || "No additional context"}

Generate exactly:
- ${codingQuestions} coding questions
- ${behavioralQuestions} behavioral questions
- ${mcqQuestions} multiple-choice questions

Format as JSON object with three arrays. Use consistent field names and structure:
{
  "coding": [
    {
      "Question": "Write a function to...",
      "Answer": "Detailed solution with code examples and explanation",
      "type": "coding",
      "difficulty": "Easy | Medium | Hard",
      "language": "javascript"
    }
  ],
  "behavioral": [
    {
      "Question": "Tell me about a time when...",
      "Answer": "Look for specific examples, problem-solving approach, and outcomes achieved. Key evaluation criteria: [list criteria]",
      "type": "behavioral",
      "difficulty": "Easy | Medium | Hard",
      "category": "Leadership | Teamwork | Problem-solving"
    }
  ],
  "mcq": [
    {
      "Question": "Which of the following best describes...?",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": 0,
      "Answer": "Explanation of why the correct answer is right and why others are wrong",
      "type": "mcq",
      "difficulty": "Easy | Medium | Hard",
      "category": "Technical knowledge"
    }
  ]
}

CRITICAL REQUIREMENTS for MCQ questions:
1. Always include an "options" array with exactly 4 options
2. Options should be plain text without letter prefixes (no A), B), C), D))
3. correctAnswer should be the index (0-3) of the correct option
4. Answer field should contain the explanation
5. Make options realistic and plausible - avoid obvious wrong answers

Generate the questions now:`;
    } else {
      return NextResponse.json(
        { error: "Either 'topic' (for question bank) or 'jobPosition' and 'jobDescription' (for standalone interview) are required" },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }]
    });

    let responseText = completion.choices[0].message.content?.trim() || "";

    // Clean up markdown code blocks
    if (responseText.startsWith("```json")) {
      responseText = responseText.replace(/```json\s*/, "").replace(/```\s*$/, "");
    } else if (responseText.startsWith("```")) {
      responseText = responseText.replace(/```\s*/, "").replace(/```\s*$/, "");
    }

    try {
      let parsedResponse = JSON.parse(responseText);
      
      // Validate and fix MCQ structure for both modes
      if (parsedResponse.mcq) {
        parsedResponse.mcq = parsedResponse.mcq.map((mcq: any, index: number) => {
          // Ensure consistent structure
          const fixedMcq = {
            id: index + 1,
            Question: mcq.Question || mcq.question,
            type: 'mcq',
            difficulty: mcq.difficulty || 'Medium',
            category: mcq.category || 'General',
            ...mcq
          };

          // Ensure options array exists
          if (!fixedMcq.options || !Array.isArray(fixedMcq.options)) {
            console.warn(`MCQ question ${index + 1} missing options array, attempting to parse from Answer field`);
            
            // Try to extract options from Answer field if they exist
            if (fixedMcq.Answer && typeof fixedMcq.Answer === 'string') {
              const answerText = fixedMcq.Answer;
              
              // Look for patterns like "A) option", "1) option", etc.
              const optionMatches = answerText.match(/[A-D]\)\s*([^A-D\n]+)/g) || 
                                   answerText.match(/[1-4]\)\s*([^1-4\n]+)/g);
              
              if (optionMatches && optionMatches.length >= 2) {
                fixedMcq.options = optionMatches.map((match: string) => 
                  match.replace(/^[A-D1-4]\)\s*/, '').trim()
                );
                
                // Try to determine correct answer
                const correctMatch = answerText.match(/correct answer is ([A-D])/i) ||
                                   answerText.match(/answer: ([A-D])/i) ||
                                   answerText.match(/^([A-D])\)/);
                
                if (correctMatch) {
                  const letter = correctMatch[1].toUpperCase();
                  fixedMcq.correctAnswer = letter.charCodeAt(0) - 65; // A=0, B=1, etc.
                }
              } else {
                // Create default options if none found
                console.warn(`Creating default options for MCQ question ${index + 1}`);
                fixedMcq.options = [
                  "Option A - Default option 1",
                  "Option B - Default option 2", 
                  "Option C - Default option 3",
                  "Option D - Default option 4"
                ];
                fixedMcq.correctAnswer = 0;
              }
            } else {
              // Last resort - create placeholder options
              fixedMcq.options = [
                "Option A",
                "Option B",
                "Option C", 
                "Option D"
              ];
              fixedMcq.correctAnswer = 0;
            }
          }

          // Ensure correctAnswer is a number
          if (typeof fixedMcq.correctAnswer === 'string') {
            const letter = fixedMcq.correctAnswer.toUpperCase();
            if (letter >= 'A' && letter <= 'D') {
              fixedMcq.correctAnswer = letter.charCodeAt(0) - 65;
            } else {
              fixedMcq.correctAnswer = 0;
            }
          }

          // Ensure correctAnswer is within bounds
          if (typeof fixedMcq.correctAnswer !== 'number' || 
              fixedMcq.correctAnswer < 0 || 
              fixedMcq.correctAnswer >= fixedMcq.options.length) {
            fixedMcq.correctAnswer = 0;
          }

          return fixedMcq;
        });
      }
      
      if (topic) {
        // Question bank mode - return the structured response directly
        return new NextResponse(JSON.stringify(parsedResponse), {
          headers: {
            "Content-Type": "application/json",
            Connection: "keep-alive",
            "Keep-Alive": "timeout=60"
          }
        });
      } else {
        // Standalone interview mode - flatten the response
        let allQuestions = [];
        
        if (parsedResponse.coding) {
          allQuestions.push(...parsedResponse.coding.map((q: any, i: number) => ({
            ...q,
            id: allQuestions.length + i + 1
          })));
        }
        if (parsedResponse.behavioral) {
          allQuestions.push(...parsedResponse.behavioral.map((q: any, i: number) => ({
            ...q,
            id: allQuestions.length + i + 1
          })));
        }
        if (parsedResponse.mcq) {
          allQuestions.push(...parsedResponse.mcq.map((q: any, i: number) => ({
            ...q,
            id: allQuestions.length + i + 1
          })));
        }

        return NextResponse.json({
          questions: allQuestions,
          metadata: {
            jobPosition,
            totalQuestions: allQuestions.length,
            distribution: {
              behavioral: behavioralQuestions,
              mcq: mcqQuestions,
              coding: codingQuestions
            },
            generatedAt: new Date().toISOString()
          }
        });
      }
    } catch (err) {
      console.error("JSON parsing error:", err);
      console.error("Raw response:", responseText);
      return NextResponse.json(
        { 
          error: "Failed to parse valid interview questions from OpenAI.",
          details: err instanceof Error ? err.message : "Unknown parsing error",
          rawResponse: responseText.substring(0, 500) // First 500 chars for debugging
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Request processing error:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate combo interview questions.",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Combo Interview Question Generator API (OpenAI GPT-4o)",
    endpoints: {
      POST: "Generate mixed interview questions (behavioral, MCQ, coding)",
      requiredParams: [
        "jobPosition (required)",
        "jobDescription (required)",
        "yearsOfExperience (optional)",
        "resumeText (optional)",
        "questionTypes (optional, default: 'behavioral,mcq,coding')",
        "totalQuestions (optional, default: 8)",
        "behavioralCount (optional, for combo interviews)",
        "mcqCount (optional, for combo interviews)",
        "codingCount (optional, for combo interviews)",
      ]
    }
  });
}
