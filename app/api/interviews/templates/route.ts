import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database/connection';
import { interviewTemplates } from '@/lib/database/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch interview templates for the company (including system templates)
    const templates = await db
      .select({
        id: interviewTemplates.id,
        templateName: interviewTemplates.templateName,
        description: interviewTemplates.description,
        jobCategory: interviewTemplates.jobCategory,
        interviewType: interviewTemplates.interviewType,
        difficultyLevel: interviewTemplates.difficultyLevel,
        timeLimit: interviewTemplates.timeLimit,
        rounds: interviewTemplates.rounds,
        isDefault: interviewTemplates.isDefault,
        isActive: interviewTemplates.isActive,
        createdAt: interviewTemplates.createdAt
      })
      .from(interviewTemplates)
      .where(
        // Get templates for this company OR system templates (where companyId is null)
        eq(interviewTemplates.isActive, true)
      )
      .orderBy(desc(interviewTemplates.createdAt));

    return NextResponse.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching interview templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch interview templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      templateName,
      description,
      jobCategory,
      interviewType,
      difficultyLevel,
      timeLimit,
      rounds
    } = body;

    if (!templateName || !jobCategory || !interviewType) {
      return NextResponse.json(
        { error: 'Template name, job category, and interview type are required' },
        { status: 400 }
      );
    }

    const [newTemplate] = await db
      .insert(interviewTemplates)
      .values({
        companyId: session.user.companyId || null,
        createdBy: session.user.id!,
        templateName,
        description,
        jobCategory,
        interviewType,
        difficultyLevel: difficultyLevel || 'medium',
        timeLimit: timeLimit || 60,
        rounds: rounds ? JSON.stringify(rounds) : null,
        isDefault: false,
        isActive: true
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newTemplate
    });
  } catch (error) {
    console.error('Error creating interview template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create interview template' },
      { status: 500 }
    );
  }
}