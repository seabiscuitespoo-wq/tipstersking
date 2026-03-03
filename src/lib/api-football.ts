// ============================================================
// TipstersKing - API-Football Integration
// https://www.api-football.com
// ============================================================

import { createClient } from '@supabase/supabase-js';
import type { ApiFootballFixture, ApiFootballResponse } from '@/types/database';

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY || '';
const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io';

// Lazy Supabase client to avoid build-time errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// ============================================================
// API-Football HTTP Client
// ============================================================

async function apiFootballFetch(endpoint: string): Promise<ApiFootballResponse> {
  const response = await fetch(`${API_FOOTBALL_BASE}${endpoint}`, {
    headers: {
      'x-apisports-key': API_FOOTBALL_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`API-Football error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ============================================================
// CRON: Fetch Upcoming Matches (daily at 02:00)
// ============================================================

/**
 * Fetch next 48h of matches from active leagues.
 * Called by /api/cron/fetch-matches
 */
export async function fetchUpcomingMatches(): Promise<{ inserted: number; updated: number; debug?: unknown }> {
  const debug: Record<string, unknown> = { 
    apiKeySet: !!API_FOOTBALL_KEY,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  
  // Get active league IDs
  let leagues: { api_football_id: number; id: number }[] | null = null;
  let leagueError: { message?: string } | null = null;
  
  try {
    const result = await db()
      .from('leagues')
      .select('api_football_id, id')
      .eq('active', true);
    leagues = result.data;
    leagueError = result.error;
    debug.leagueCount = leagues?.length ?? 0;
    debug.leagueError = leagueError?.message;
  } catch (err) {
    debug.leagueException = String(err);
    return { inserted: 0, updated: 0, debug };
  }

  if (leagueError || !leagues?.length) {
    console.error('Failed to fetch active leagues:', leagueError);
    return { inserted: 0, updated: 0, debug };
  }

  // Create league ID map for quick lookup
  const leagueMap = new Map(leagues.map((l: { api_football_id: number; id: number }) => [l.api_football_id, l.id]));
  const activeLeagueIds = new Set(leagues.map((l: { api_football_id: number }) => l.api_football_id));

  // Fetch fixtures for next 3 days (to stay within free tier limits)
  // API-Football free tier: 100 requests/day
  const dates: string[] = [];
  for (let i = 0; i < 3; i++) {
    const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
    dates.push(date.toISOString().split('T')[0]);
  }

  let inserted = 0;
  let updated = 0;

  debug.dates = dates;
  debug.fetchResults = [];

  for (const date of dates) {
    try {
      const data = await apiFootballFetch(`/fixtures?date=${date}`);
      
      const fetchResult: Record<string, unknown> = { 
        date, 
        total: data.response?.length ?? 0
      };
      
      if (!data.response?.length) {
        console.log(`No fixtures found for ${date}`);
        (debug.fetchResults as unknown[]).push(fetchResult);
        continue;
      }

      // Filter to only our active leagues
      const relevantFixtures = data.response.filter(
        (f: ApiFootballFixture) => activeLeagueIds.has(f.league.id)
      );

      fetchResult.relevant = relevantFixtures.length;
      (debug.fetchResults as unknown[]).push(fetchResult);

      console.log(`${date}: ${data.response.length} total, ${relevantFixtures.length} in active leagues`);

      for (const fixture of relevantFixtures) {
        const leagueDbId = leagueMap.get(fixture.league.id);
        if (!leagueDbId) continue;

        const matchData = {
          api_football_id: fixture.fixture.id,
          league_id: leagueDbId,
          home_team: fixture.teams.home.name,
          away_team: fixture.teams.away.name,
          home_team_logo: fixture.teams.home.logo,
          away_team_logo: fixture.teams.away.logo,
          kickoff_time: fixture.fixture.date,
          // deadline is auto-calculated by trigger
          status: mapApiStatus(fixture.fixture.status.short),
          home_score: fixture.goals.home,
          away_score: fixture.goals.away,
          fetched_at: new Date().toISOString(),
        };

        // Upsert: insert or update if exists
        const { error } = await db()
          .from('matches')
          .upsert(matchData, { 
            onConflict: 'api_football_id',
            ignoreDuplicates: false 
          })
          .select('id')
          .single();

        if (error) {
          console.error('Failed to upsert match:', fixture.fixture.id, error);
        } else {
          inserted++;
        }
      }
    } catch (err) {
      console.error(`Failed to fetch fixtures for ${date}:`, err);
    }
  }

  console.log(`Fetched matches: ${inserted} inserted/updated`);
  return { inserted, updated, debug };
}

// ============================================================
// CRON: Update Match Status (hourly)
// ============================================================

/**
 * Update status of matches (postponed, cancelled).
 * Called by /api/cron/update-status
 */
export async function updateMatchStatus(): Promise<number> {
  // Get today's matches that might need status update
  const today = new Date().toISOString().split('T')[0];
  
  const data = await apiFootballFetch(`/fixtures?date=${today}`);

  if (!data.response?.length) {
    return 0;
  }

  let updated = 0;

  for (const fixture of data.response) {
    const newStatus = mapApiStatus(fixture.fixture.status.short);
    
    // Only update if status changed to postponed or cancelled
    if (newStatus === 'postponed' || newStatus === 'cancelled') {
      const { error } = await db()
        .from('matches')
        .update({ status: newStatus })
        .eq('api_football_id', fixture.fixture.id);

      if (!error) {
        updated++;

        // Mark tips as void if match postponed/cancelled
        const { data: match } = await db()
          .from('matches')
          .select('id')
          .eq('api_football_id', fixture.fixture.id)
          .single();

        if (match) {
          await db()
            .from('tips')
            .update({ status: 'void' })
            .eq('match_id', match.id)
            .eq('status', 'pending');
        }
      }
    }
  }

  console.log(`Updated ${updated} match statuses`);
  return updated;
}

// ============================================================
// CRON: Update Results (every 30min, 14:00-02:00)
// ============================================================

/**
 * Fetch finished matches and update scores + tip statuses.
 * Called by /api/cron/update-results
 */
export async function updateMatchResults(): Promise<number> {
  // Get matches that started in the last 6 hours and might be finished
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  
  // Fetch from DB matches that are live or recently kicked off
  const { data: pendingMatches, error } = await db()
    .from('matches')
    .select('api_football_id, id')
    .in('status', ['upcoming', 'live'])
    .lt('kickoff_time', new Date().toISOString())
    .gt('kickoff_time', sixHoursAgo.toISOString());

  if (error || !pendingMatches?.length) {
    return 0;
  }

  let updated = 0;

  // Fetch results from API-Football in batches
  for (const match of pendingMatches) {
    try {
      const data = await apiFootballFetch(`/fixtures?id=${match.api_football_id}`);
      
      if (!data.response?.length) continue;

      const fixture = data.response[0];
      const status = mapApiStatus(fixture.fixture.status.short);

      if (status === 'finished' && fixture.goals.home !== null && fixture.goals.away !== null) {
        // Update match in DB
        await db()
          .from('matches')
          .update({
            status: 'finished',
            home_score: fixture.goals.home,
            away_score: fixture.goals.away,
          })
          .eq('id', match.id);

        // Update tip statuses
        const { updateTipStatuses } = await import('./tips');
        await updateTipStatuses(match.id, fixture.goals.home, fixture.goals.away);

        updated++;
      } else if (status === 'live') {
        // Update match status to live
        await db()
          .from('matches')
          .update({ status: 'live' })
          .eq('id', match.id);
      }
    } catch (err) {
      console.error(`Failed to update match ${match.api_football_id}:`, err);
    }
  }

  console.log(`Updated ${updated} match results`);
  return updated;
}

// ============================================================
// Helper: Map API-Football status codes
// ============================================================

function mapApiStatus(apiStatus: string): string {
  const statusMap: Record<string, string> = {
    'TBD': 'upcoming',
    'NS': 'upcoming',     // Not Started
    '1H': 'live',         // First Half
    'HT': 'live',         // Halftime
    '2H': 'live',         // Second Half
    'ET': 'live',         // Extra Time
    'P': 'live',          // Penalty
    'FT': 'finished',     // Full Time
    'AET': 'finished',    // After Extra Time
    'PEN': 'finished',    // After Penalties
    'PST': 'postponed',   // Postponed
    'CANC': 'cancelled',  // Cancelled
    'ABD': 'cancelled',   // Abandoned
    'AWD': 'finished',    // Awarded
    'WO': 'finished',     // Walk Over
    'LIVE': 'live',
  };

  return statusMap[apiStatus] || 'upcoming';
}

// ============================================================
// Utility: Get upcoming matches for Telegram bot
// ============================================================

export async function getUpcomingMatchesForBot(hours: number = 48) {
  const futureDate = new Date(Date.now() + hours * 60 * 60 * 1000);

  const { data: matches, error } = await db()
    .from('matches')
    .select(`
      id,
      home_team,
      away_team,
      kickoff_time,
      deadline,
      leagues (
        name,
        country
      )
    `)
    .eq('status', 'upcoming')
    .gt('deadline', new Date().toISOString())
    .lt('kickoff_time', futureDate.toISOString())
    .order('kickoff_time', { ascending: true });

  if (error) {
    console.error('Failed to fetch upcoming matches:', error);
    return [];
  }

  return matches || [];
}
