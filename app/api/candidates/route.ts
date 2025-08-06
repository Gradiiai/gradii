import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database/connection';
import { candidateUsers, candidateApplications, candidateProfiles, jobCampaigns, companies } from '@/lib/database/schema';
import { eq, desc, and, or, ilike } from 'drizzle-orm';

// GET - Fetch candidates (for admin/company dashboard)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const campaignId = searchParams.get('campaignId');
    const status = searchParams.get('status');

    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions = [];
    
    if (campaignId) {
      conditions.push(eq(candidateApplications.campaignId, campaignId));
    }
    
    if (status) {
      conditions.push(eq(candidateApplications.status, status));
    }
    
    if (search) {
      conditions.push(
        or(
          ilike(candidateUsers.firstName, `%${search}%`),
          ilike(candidateUsers.lastName, `%${search}%`),
          ilike(candidateUsers.email, `%${search}%`)
        )
      );
    }

    // Fetch candidates with their applications and job details
    const candidates = await db
      .select({
        id: candidateUsers.id,
        firstName: candidateUsers.firstName,
        lastName: candidateUsers.lastName,
        email: candidateUsers.email,
        phone: candidateUsers.phone,
        profileImage: candidateUsers.profileImage,
        createdAt: candidateUsers.createdAt,
        // Profile data
        location: candidateProfiles.location,
        resumeUrl: candidateProfiles.resumeUrl,
        linkedinUrl: candidateProfiles.linkedinUrl,
        portfolioUrl: candidateProfiles.portfolioUrl,
        currentTitle: candidateProfiles.currentTitle,
        currentCompany: candidateProfiles.currentCompany,
        // Application data
        applicationId: candidateApplications.id,
        applicationStatus: candidateApplications.status,
        appliedAt: candidateApplications.appliedAt,
        overallScore: candidateApplications.overallScore,
        // Job data
        jobTitle: jobCampaigns.jobTitle,
        campaignName: jobCampaigns.campaignName,
        companyName: companies.name,
      })
      .from(candidateUsers)
      .innerJoin(candidateApplications, eq(candidateUsers.id, candidateApplications.candidateId))
      .leftJoin(candidateProfiles, eq(candidateUsers.id, candidateProfiles.candidateId))
      .innerJoin(jobCampaigns, eq(candidateApplications.campaignId, jobCampaigns.id))
      .innerJoin(companies, eq(jobCampaigns.companyId, companies.id))
      .where(and(...conditions))
      .orderBy(desc(candidateApplications.appliedAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalResult = await db
      .select({ count: candidateUsers.id })
      .from(candidateUsers)
      .innerJoin(candidateApplications, eq(candidateUsers.id, candidateApplications.candidateId))
      .innerJoin(jobCampaigns, eq(candidateApplications.campaignId, jobCampaigns.id))
      .where(and(...conditions));

    const total = totalResult.length;

    return NextResponse.json({
      success: true,
      candidates: candidates.map(candidate => ({
        id: candidate.id,
        name: `${candidate.firstName} ${candidate.lastName}`,
        email: candidate.email,
        phone: candidate.phone,
        location: candidate.location,
        resumeUrl: candidate.resumeUrl,
        linkedinUrl: candidate.linkedinUrl,
        portfolioUrl: candidate.portfolioUrl,
        status: candidate.applicationStatus,
        appliedDate: candidate.appliedAt,
        overallScore: candidate.overallScore,
        jobTitle: candidate.jobTitle,
        campaignName: candidate.campaignName,
        companyName: candidate.companyName,
        createdAt: candidate.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching candidates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new candidate (for public applications)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      location,
      resumeUrl,
      linkedinUrl,
      portfolioUrl,
      campaignId,
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !campaignId) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, email, campaignId' },
        { status: 400 }
      );
    }

    // Get campaign details to extract companyId
    const campaign = await db
      .select({ id: jobCampaigns.id, companyId: jobCampaigns.companyId })
      .from(jobCampaigns)
      .where(eq(jobCampaigns.id, campaignId))
      .limit(1);

    if (campaign.length === 0) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const companyId = campaign[0].companyId;

    // Check if candidate already exists
    const existingCandidate = await db
      .select({ id: candidateUsers.id })
      .from(candidateUsers)
      .where(eq(candidateUsers.email, email))
      .limit(1);

    let candidateId: string;

    if (existingCandidate.length > 0) {
      candidateId = existingCandidate[0].id;
    } else {
      // Create new candidate
      const [newCandidate] = await db
        .insert(candidateUsers)
        .values({
          firstName,
          lastName,
          email,
          phone,
          isActive: true,
        })
        .returning({ id: candidateUsers.id });

      candidateId = newCandidate.id;

      // Create profile record if additional data provided
      if (location || resumeUrl || linkedinUrl || portfolioUrl) {
        await db
          .insert(candidateProfiles)
          .values({
            candidateId,
            location,
            resumeUrl,
            linkedinUrl,
            portfolioUrl,
          });
      }
    }

    // Create application record
    const [application] = await db
      .insert(candidateApplications)
      .values({
        candidateId,
        campaignId,
        companyId,
        status: 'applied',
        appliedAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      candidateId,
      applicationId: application.id,
      message: 'Candidate application submitted successfully',
    });

  } catch (error) {
    console.error('Error creating candidate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}