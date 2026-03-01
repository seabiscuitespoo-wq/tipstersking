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
    const result = await fetchUpcomingMatches();
    
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cron fetch-matches failed:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
