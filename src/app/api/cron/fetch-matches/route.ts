// ============================================================
// CRON: Fetch Upcoming Matches
// Schedule: 0 2 * * * (daily at 02:00 UTC)
// ============================================================

import { NextResponse } from 'next/server';
import { fetchUpcomingMatches } from '@/lib/api-football';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Verify cron secret (Vercel sets this automatically)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Debug: Check if API key is set
    const hasApiKey = !!process.env.API_FOOTBALL_KEY;
    
    const result = await fetchUpcomingMatches();
    
    return NextResponse.json({
      success: true,
      inserted: result.inserted,
      updated: result.updated,
      debug: { hasApiKey, ...result.debug },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cron fetch-matches failed:', error);
    return NextResponse.json(
      { success: false, error: String(error), stack: (error as Error)?.stack },
      { status: 500 }
    );
  }
}
