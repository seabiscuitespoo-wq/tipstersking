// ============================================================
// CRON: Update Match Status (postponed/cancelled)
// Schedule: 0 * * * * (hourly)
// ============================================================

import { NextResponse } from 'next/server';
import { updateMatchStatus } from '@/lib/api-football';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const updated = await updateMatchStatus();
    
    return NextResponse.json({
      success: true,
      updated,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cron update-status failed:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
