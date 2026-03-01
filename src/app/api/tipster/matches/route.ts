// ============================================================
// Tipster Matches API
// GET: Upcoming matches for tip submission (48h window)
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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const hours = parseInt(searchParams.get('hours') || '48');
  const leagueId = searchParams.get('league') || undefined;

  try {
    const now = new Date();
    const futureDate = new Date(now.getTime() + hours * 60 * 60 * 1000);

    let query = db()
      .from('matches')
      .select(`
        id,
        api_football_id,
        home_team,
        away_team,
        home_team_logo,
        away_team_logo,
        kickoff_time,
        deadline,
        status,
        league_id,
        leagues (
          id,
          name,
          country,
          logo_url
        )
      `)
      .eq('status', 'upcoming')
      .gt('deadline', now.toISOString())
      .lt('kickoff_time', futureDate.toISOString())
      .order('kickoff_time', { ascending: true });

    if (leagueId) {
      query = query.eq('league_id', leagueId);
    }

    const { data: matches, error } = await query;

    if (error) {
      console.error('Failed to fetch matches:', error);
      return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
    }

    // Add time until deadline
    const matchesWithDeadline = matches?.map((match: any) => {
      const deadline = new Date(match.deadline);
      const timeLeft = deadline.getTime() - now.getTime();
      const minutesLeft = Math.floor(timeLeft / 60000);
      const hoursLeft = Math.floor(minutesLeft / 60);

      return {
        ...match,
        minutes_until_deadline: minutesLeft,
        deadline_display: hoursLeft > 0 
          ? `${hoursLeft}h ${minutesLeft % 60}m`
          : `${minutesLeft}m`,
      };
    });

    return NextResponse.json(matchesWithDeadline || []);

  } catch (error) {
    console.error('Matches API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
