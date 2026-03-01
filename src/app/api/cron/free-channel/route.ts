// ============================================================
// CRON: Publish to Free Channel
// Schedule: */5 * * * * (every 5 minutes)
// Publishes tips with 120min delay to free channel
// ============================================================

import { NextResponse } from 'next/server';
import { publishToFreeChannel } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const published = await publishToFreeChannel();
    
    return NextResponse.json({
      success: true,
      published,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cron free-channel failed:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
