// ============================================================
// CRON: Update Match Results
// Schedule: */30 * * * * (every 30 minutes)
// ============================================================

import { NextResponse } from 'next/server';
import { updateMatchResults } from '@/lib/api-football';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const updated = await updateMatchResults();
    
    return NextResponse.json({
      success: true,
      updated,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cron update-results failed:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
