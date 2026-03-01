// ============================================================
// Tipster Stats API
// GET: Tipster's performance statistics
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
  const profileId = searchParams.get('profileId');

  if (!profileId) {
    return NextResponse.json({ error: 'profileId required' }, { status: 400 });
  }

  try {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get tipster profile
    const { data: tipster, error: tipsterError } = await db()
      .from('tipster_profiles')
      .select('alias, tip_count_total, approved_at, stripe_account_id')
      .eq('profile_id', profileId)
      .single();

    if (tipsterError || !tipster) {
      return NextResponse.json({ error: 'Tipster not found' }, { status: 404 });
    }

    // Get all settled tips
    const { data: allTips } = await db()
      .from('tips')
      .select('odds, status, tip_timestamp')
      .eq('profile_id', profileId)
      .in('status', ['won', 'lost']);

    // Get 90-day tips
    const { data: tips90d } = await db()
      .from('tips')
      .select('odds, status, tip_timestamp')
      .eq('profile_id', profileId)
      .gte('tip_timestamp', ninetyDaysAgo.toISOString())
      .in('status', ['won', 'lost']);

    // Get monthly tips
    const { data: tipsMonthly } = await db()
      .from('tips')
      .select('odds, status')
      .eq('profile_id', profileId)
      .gte('tip_timestamp', monthStart.toISOString())
      .in('status', ['won', 'lost']);

    // Get pending tips count
    const { count: pendingCount } = await db()
      .from('tips')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('status', 'pending');

    // Calculate ROI helper
    const calculateRoi = (tips: any[]) => {
      if (!tips || tips.length === 0) return null;
      
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

      return {
        roi_pct: (profitUnits / tips.length) * 100,
        win_rate: (wins / tips.length) * 100,
        tip_count: tips.length,
        profit_units: profitUnits,
        wins,
        losses: tips.length - wins,
      };
    };

    const stats90d = calculateRoi(tips90d || []);
    const statsMonthly = calculateRoi(tipsMonthly || []);
    const statsAllTime = calculateRoi(allTips || []);

    // Get monthly rank
    let monthlyRank = null;
    const { data: commission } = await db()
      .from('monthly_commissions')
      .select('rank, net_amount')
      .eq('profile_id', profileId)
      .eq('period_year', now.getFullYear())
      .eq('period_month', now.getMonth() + 1)
      .single();

    if (commission) {
      monthlyRank = commission.rank;
    }

    // Get last 6 months earnings
    const { data: earnings } = await db()
      .from('monthly_commissions')
      .select('period_year, period_month, rank, net_amount, roi_pct, tip_count')
      .eq('profile_id', profileId)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(6);

    return NextResponse.json({
      alias: tipster.alias,
      totalTips: tipster.tip_count_total || 0,
      pendingTips: pendingCount || 0,
      approvedAt: tipster.approved_at,
      hasPayoutSetup: !!tipster.stripe_account_id,
      
      stats90d,
      statsMonthly,
      statsAllTime,
      
      monthlyRank,
      earningsHistory: earnings || [],
    });

  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
