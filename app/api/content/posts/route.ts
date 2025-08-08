import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { posts } from '@/lib/database/schema';
import { and, desc, eq } from 'drizzle-orm';

// GET /api/content/posts?companyId=...
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || session.user.companyId;

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'Company ID required' }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(posts)
      .where(eq(posts.companyId, companyId))
      .orderBy(desc(posts.createdAt));

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch posts' }, { status: 500 });
  }
}

// POST /api/content/posts
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      department,
      location,
      experienceLevel,
      experienceMin,
      experienceMax,
      employeeType,
      salaryMin,
      salaryMax,
      currency = 'INR',
      isRemote = false,
      isHybrid = false,
      salaryNegotiable = false,
      courseDegree,
      specialization,
      companyId: companyIdRaw,
    } = body;

    const companyId = companyIdRaw || session.user.companyId;
    if (!companyId) {
      return NextResponse.json({ success: false, error: 'Company ID is required' }, { status: 400 });
    }

    if (!title || !department || !location || !employeeType) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const [row] = await db
      .insert(posts)
      .values({
        companyId,
        createdBy: session.user.id!,
        title,
        department,
        location,
        experienceLevel: experienceLevel || null,
        experienceMin: experienceMin ?? null,
        experienceMax: experienceMax ?? null,
        employeeType,
        salaryMin: salaryMin ?? null,
        salaryMax: salaryMax ?? null,
        currency,
        isRemote,
        isHybrid,
        salaryNegotiable,
        courseDegree: courseDegree || null,
        specialization: specialization || null,
      })
      .returning();

    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ success: false, error: 'Failed to create post' }, { status: 500 });
  }
}


