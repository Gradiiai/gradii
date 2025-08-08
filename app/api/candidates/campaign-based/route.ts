import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { getAllCandidatesByCompany } from '@/lib/database/queries/campaigns';

/**
 * GET /api/candidates/campaign-based
 * Fetch all campaign-based candidates for a company (excludes direct interview candidates)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const companyId = session.user.companyId || searchParams.get('companyId');
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const campaignId = searchParams.get('campaignId') || undefined;

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // Build filters object for campaign-based candidates only
    // We want to exclude direct interview candidates by filtering out 'direct' source
    const filters = {
      status,
      search,
      campaignId
    };
    
    // Remove undefined values from filters
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof typeof filters] === undefined) {
        delete filters[key as keyof typeof filters];
      }
    });
    
    const result = await getAllCandidatesByCompany(
      companyId, 
      Object.keys(filters).length > 0 ? filters : undefined
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Filter out direct interview candidates from the results
    const campaignBasedCandidates = (result.data || []).filter(candidate => 
      candidate.source !== 'direct' && 
      candidate.applicationSource !== 'direct'
    );

    // Return the response in the format expected by the frontend
    return NextResponse.json({
      success: true,
      candidates: campaignBasedCandidates
    });

  } catch (error) {
    console.error('Error in GET /api/candidates/campaign-based:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}