// ============================================================
// Tipster Tips API
// GET: List tipster's tips
// POST: Submit a new tip
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

let _db: any = null;
function db() {
  if (!_db) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase env vars');
    _db = createClient(url, key);
  }
  return _db;
}

export const dynamic = 'force-dynamic';

// GET: List tips for a tipster
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const profileId = searchParams.get('profileId');
  const status = searchParams.get('status'); // pending, won, lost, void
  const limit = parseInt(searchParams.get('limit') || '50');

  if (!profileId) {
    return NextResponse.json({ error: 'profileId required' }, { status: 400 });
  }

  try {
    let query = db()
      .from('tips')
      .select(`
        id,
        match_id,
        market_type,
        pick,
        odds,
        tip_timestamp,
        status,
        analysis,
        created_at,
        matches (
          id,
          home_team,
          away_team,
          kickoff_time,
          status,
          home_score,
          away_score,
          leagues (
            name
          )
        )
      `)
      .eq('profile_id', profileId)
      .order('tip_timestamp', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: tips, error } = await query;

    if (error) {
      console.error('Failed to fetch tips:', error);
      return NextResponse.json({ error: 'Failed to fetch tips' }, { status: 500 });
    }

    return NextResponse.json(tips || []);

  } catch (error) {
    console.error('Tips GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Submit a new tip
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId, matchId, marketType, pick, odds, analysis } = body;

    // Validate required fields
    if (!profileId || !matchId || !marketType || !pick || !odds) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate odds range
    if (odds < 1.30 || odds > 10.00) {
      return NextResponse.json({ error: 'Odds must be between 1.30 and 10.00' }, { status: 400 });
    }

    // Check if tipster is approved
    const { data: tipster, error: tipsterError } = await db()
      .from('tipster_profiles')
      .select('application_status, active')
      .eq('profile_id', profileId)
      .single();

    if (tipsterError || !tipster) {
      return NextResponse.json({ error: 'Tipster profile not found' }, { status: 404 });
    }

    if (tipster.application_status !== 'approved' || !tipster.active) {
      return NextResponse.json({ error: 'Tipster not approved' }, { status: 403 });
    }

    // Get match and validate deadline
    const { data: match, error: matchError } = await db()
      .from('matches')
      .select('deadline, status')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    if (match.status !== 'upcoming') {
      return NextResponse.json({ error: 'Match is not upcoming' }, { status: 400 });
    }

    const now = new Date();
    const deadline = new Date(match.deadline);

    if (now > deadline) {
      return NextResponse.json({ error: 'Deadline has passed' }, { status: 400 });
    }

    // Check for duplicate tip
    const { data: existingTip } = await db()
      .from('tips')
      .select('id')
      .eq('profile_id', profileId)
      .eq('match_id', matchId)
      .eq('market_type', marketType)
      .single();

    if (existingTip) {
      return NextResponse.json({ error: 'You already have a tip for this match/market' }, { status: 400 });
    }

    // Create tip
    const tipTimestamp = now.toISOString();

    const { data: tip, error: tipError } = await db()
      .from('tips')
      .insert({
        profile_id: profileId,
        match_id: matchId,
        market_type: marketType,
        pick,
        odds,
        tip_timestamp: tipTimestamp,
        analysis: analysis || null,
        status: 'pending',
      })
      .select()
      .single();

    if (tipError) {
      console.error('Failed to create tip:', tipError);
      return NextResponse.json({ error: 'Failed to submit tip' }, { status: 500 });
    }

    // Update tipster's total tip count
    await db().rpc('increment_tip_count', { p_profile_id: profileId });

    // Queue for free channel (120min delay)
    const scheduledAt = new Date(now.getTime() + 120 * 60 * 1000);
    await db()
      .from('free_channel_queue')
      .insert({
        tip_id: tip.id,
        scheduled_at: scheduledAt.toISOString(),
      });

    return NextResponse.json({ 
      success: true, 
      tip,
      message: 'Tip submitted successfully' 
    });

  } catch (error) {
    console.error('Tips POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
