// ============================================================
// Leaderboard API
// Returns tipsters ranked by 90-day rolling ROI
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy Supabase client
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

interface LeaderboardQuery {
  league?: string;
  month?: string; // YYYY-MM format
  sort?: 'roi' | 'winRate' | 'tips' | 'monthlyRoi';
  limit?: number;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const league = searchParams.get('league') || undefined;
  const month = searchParams.get('month') || undefined;
  const sort = (searchParams.get('sort') as LeaderboardQuery['sort']) || 'roi';
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    const leaderboard = await getLeaderboard({ league, month, sort, limit });
    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}

async function getLeaderboard(query: LeaderboardQuery) {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Get all approved active tipsters
  const { data: tipsters, error: tipsterError } = await db()
    .from('tipster_profiles')
    .select(`
      profile_id,
      alias,
      tip_count_total,
      approved_at
    `)
    .eq('application_status', 'approved')
    .eq('active', true);

  if (tipsterError || !tipsters) {
    console.error('Failed to fetch tipsters:', tipsterError);
    return [];
  }

  // Build leaderboard with stats
  const leaderboardData = [];

  for (const tipster of tipsters) {
    // Skip if less than 50 total tips
    if (tipster.tip_count_total < 50) continue;

    // Build tips query
    let tipsQuery = db()
      .from('tips')
      .select(`
        id,
        odds,
        status,
        tip_timestamp,
        match_id,
        matches!inner (
          league_id,
          leagues!inner (
            name
          )
        )
      `)
      .eq('profile_id', tipster.profile_id)
      .gte('tip_timestamp', ninetyDaysAgo.toISOString())
      .in('status', ['won', 'lost']);

    // Apply league filter if specified
    if (query.league) {
      tipsQuery = tipsQuery.eq('matches.leagues.name', query.league);
    }

    const { data: tips, error: tipsError } = await tipsQuery;

    if (tipsError || !tips || tips.length === 0) continue;

    // Calculate 90-day ROI
    let profitUnits = 0;
    let wins = 0;

    for (const tip of tips) {
      if (tip.status === 'won') {
        profitUnits += (Number(tip.odds) - 1);
        wins++;
      } else {
        profitUnits -= 1;
      }
    }

    const roi90d = (profitUnits / tips.length) * 100;
    const winRate = (wins / tips.length) * 100;

    // Calculate monthly ROI (current month)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyTips = tips.filter((t: any) => new Date(t.tip_timestamp) >= monthStart);
    
    let monthlyRoi = null;
    if (monthlyTips.length >= 10) {
      let monthlyProfit = 0;
      for (const tip of monthlyTips) {
        if (tip.status === 'won') {
          monthlyProfit += (Number(tip.odds) - 1);
        } else {
          monthlyProfit -= 1;
        }
      }
      monthlyRoi = (monthlyProfit / monthlyTips.length) * 100;
    }

    // Determine badge
    const badge = calculateBadge(tipster, tips);

    leaderboardData.push({
      profile_id: tipster.profile_id,
      alias: tipster.alias,
      roi_pct: roi90d,
      win_rate: winRate,
      tip_count: tips.length,
      monthly_roi: monthlyRoi,
      badge,
      approved_at: tipster.approved_at,
    });
  }

  // Sort based on query
  switch (query.sort) {
    case 'winRate':
      leaderboardData.sort((a, b) => b.win_rate - a.win_rate);
      break;
    case 'tips':
      leaderboardData.sort((a, b) => b.tip_count - a.tip_count);
      break;
    case 'monthlyRoi':
      leaderboardData.sort((a, b) => (b.monthly_roi ?? -999) - (a.monthly_roi ?? -999));
      break;
    case 'roi':
    default:
      leaderboardData.sort((a, b) => b.roi_pct - a.roi_pct);
  }

  // Add ranks and limit
  return leaderboardData.slice(0, query.limit).map((entry, index) => ({
    rank: index + 1,
    ...entry,
  }));
}

function calculateBadge(
  tipster: { tip_count_total: number; approved_at: string | null },
  tips: any[]
): 'established' | 'rising' | 'inconsistent' {
  const tipCount = tipster.tip_count_total || 0;
  const approvedAt = tipster.approved_at ? new Date(tipster.approved_at) : new Date();
  const monthsActive = Math.floor(
    (Date.now() - approvedAt.getTime()) / (30 * 24 * 60 * 60 * 1000)
  );

  // 🟢 Established: 200+ tips AND 6+ months
  if (tipCount >= 200 && monthsActive >= 6) {
    return 'established';
  }

  // Check variance for inconsistent badge (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentTips = tips.filter((t: any) => new Date(t.tip_timestamp) >= thirtyDaysAgo);

  if (recentTips.length >= 10) {
    const profits = recentTips.map((t: any) =>
      t.status === 'won' ? Number(t.odds) - 1 : -1
    );
    const mean = profits.reduce((a: number, b: number) => a + b, 0) / profits.length;
    const variance = profits.reduce((sum: number, p: number) => sum + Math.pow(p - mean, 2), 0) / profits.length;

    if (variance > 2) {
      return 'inconsistent';
    }
  }

  // 🟡 Rising: default
  return 'rising';
}
