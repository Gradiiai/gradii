import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { candidates, jobCampaigns } from '@/lib/database/schema';
import { eq, and, or, ilike, desc, count, ne } from 'drizzle-orm';

// GET - Fetch candidates from campaign-based system (excludes direct interviews)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const campaignId = searchParams.get('campaignId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query conditions
    const conditions = [];
    
    // Add company filter through jobCampaigns
    conditions.push(eq(jobCampaigns.companyId, session.user.companyId));
    
    // Exclude direct interview campaigns
    conditions.push(ne(jobCampaigns.campaignName, 'Direct Interview'));
    
    // Add status filter if provided
    if (status && status !== 'all') {
      conditions.push(eq(candidates.status, status));
    }
    
    // Add campaign filter if provided
    if (campaignId && campaignId !== 'all') {
      conditions.push(eq(candidates.campaignId, campaignId));
    }

    // Add search filter if provided
    if (search) {
      conditions.push(
        or(
          ilike(candidates.name, `%${search}%`),
          ilike(candidates.email, `%${search}%`)
        )
      );
    }

    // Fetch candidates with campaign details
    const result = await db.select({
      id: candidates.id,
      campaignId: candidates.campaignId,
      name: candidates.name,
      email: candidates.email,
      phone: candidates.phone,
      location: candidates.location,
      resumeUrl: candidates.resumeUrl,
      linkedinUrl: candidates.linkedinUrl,
      portfolioUrl: candidates.portfolioUrl,
      experience: candidates.experience,
      currentCompany: candidates.currentCompany,
      currentRole: candidates.currentRole,
      skills: candidates.skills,
      source: candidates.source,
      status: candidates.status,
      overallScore: candidates.overallScore,
      talentFitScore: candidates.talentFitScore,
      aiParsedData: candidates.aiParsedData,
      appliedAt: candidates.appliedAt,
      updatedAt: candidates.updatedAt,
      // Campaign details
      campaignName: jobCampaigns.campaignName,
      jobTitle: jobCampaigns.jobTitle,
      department: jobCampaigns.department,
    })
    .from(candidates)
    .innerJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
    .where(and(...conditions))
    .limit(limit)
    .offset(offset)
    .orderBy(desc(candidates.appliedAt));

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: count() })
      .from(candidates)
      .innerJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .where(and(...conditions));
    
    const totalCount = totalCountResult[0].count;

    // Transform data to match expected format
    const transformedCandidates = result.map(candidate => ({
      id: candidate.id,
      campaignId: candidate.campaignId,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      location: candidate.location,
      experience: candidate.experience,
      skills: candidate.skills ? JSON.parse(candidate.skills) : [],
      status: candidate.status,
      appliedDate: candidate.appliedAt,
      resumeUrl: candidate.resumeUrl,
      linkedinUrl: candidate.linkedinUrl,
      portfolioUrl: candidate.portfolioUrl,
      talentFitScore: candidate.talentFitScore,
      overallScore: candidate.overallScore,
      currentCompany: candidate.currentCompany,
      currentRole: candidate.currentRole,
      source: candidate.source,
      campaignName: candidate.campaignName,
      jobTitle: candidate.jobTitle,
      department: candidate.department,
    }));

    return NextResponse.json({
      success: true,
      candidates: transformedCandidates,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: totalCount > offset + limit
      },
      message: 'Campaign-based candidates retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching campaign-based candidates:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to fetch candidates'
      },
      { status: 500 }
    );
  }
}
