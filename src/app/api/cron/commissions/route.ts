// ============================================================
// CRON: Monthly Commissions
// Schedule: 50 23 28-31 * * (last day of month at 23:50 UTC)
// ============================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { 
  COMMISSION_SHARES, 
  TIPSTER_POOL, 
  TRANSACTION_FEE,
  MIN_TIPS_FOR_COMMISSION 
} from '@/types/database';
import { getMonthlyRoi } from '@/lib/tips';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

// Lazy initialization to avoid build-time errors
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Missing STRIPE_SECRET_KEY');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _supabaseAdmin: any = null;
const getSupabaseAdmin = () => {
  if (_supabaseAdmin) return _supabaseAdmin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  _supabaseAdmin = createClient(url, key);
  return _supabaseAdmin;
};

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if it's actually the last day of the month
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (tomorrow.getDate() !== 1) {
    return NextResponse.json({
      success: true,
      message: 'Not the last day of month, skipping',
      timestamp: now.toISOString()
    });
  }

  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  try {
    const result = await runMonthlyCommissions(year, month);
    
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: now.toISOString()
    });
  } catch (error) {
    console.error('Monthly commissions failed:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

interface CommissionResult {
  totalPaid: number;
  tipstersPaid: number;
  commissions: Array<{
    alias: string;
    rank: number;
    roi: number;
    tipCount: number;
    amount: number;
  }>;
}

async function runMonthlyCommissions(year: number, month: number): Promise<CommissionResult> {
  console.log(`Running commissions for ${year}-${month}`);

  // 1. Get all active approved tipsters
  const supabaseAdmin = getSupabaseAdmin();
  const { data: tipsters, error: tipsterError } = await supabaseAdmin
    .from('profiles')
    .select(`
      id,
      tipster_profiles!inner (
        alias,
        stripe_account_id,
        active,
        application_status
      )
    `)
    .eq('role', 'tipster')
    .eq('tipster_profiles.active', true)
    .eq('tipster_profiles.application_status', 'approved');

  if (tipsterError || !tipsters?.length) {
    console.log('No active tipsters found');
    return { totalPaid: 0, tipstersPaid: 0, commissions: [] };
  }

  // 2. Calculate ROI for each tipster
  const tipsterStats: Array<{
    profileId: string;
    alias: string;
    stripeAccountId: string | null;
    roi: number;
    tipCount: number;
  }> = [];

  for (const tipster of tipsters) {
    const tp = tipster.tipster_profiles as any;
    const roi = await getMonthlyRoi(tipster.id, year, month);
    
    // Must have positive ROI and minimum tips
    if (roi && roi.roi_pct > 0 && roi.tip_count >= MIN_TIPS_FOR_COMMISSION) {
      tipsterStats.push({
        profileId: tipster.id,
        alias: tp.alias,
        stripeAccountId: tp.stripe_account_id,
        roi: roi.roi_pct,
        tipCount: roi.tip_count
      });
    }
  }

  // 3. Sort by ROI and take top 10
  tipsterStats.sort((a, b) => b.roi - a.roi);
  const top10 = tipsterStats.slice(0, 10);

  if (top10.length === 0) {
    console.log('No qualifying tipsters this month');
    return { totalPaid: 0, tipstersPaid: 0, commissions: [] };
  }

  // 4. Calculate gross revenue for the month
  const grossRevenue = await getMonthlyGrossRevenue(year, month);
  const pool = grossRevenue * TIPSTER_POOL;

  console.log(`Gross revenue: €${grossRevenue}, Pool: €${pool}`);

  // 5. Pay each qualifying tipster
  const commissions: CommissionResult['commissions'] = [];
  let totalPaid = 0;

  for (let i = 0; i < top10.length; i++) {
    const tipster = top10[i];
    const sharePercent = COMMISSION_SHARES[i];
    const gross = pool * sharePercent;
    const net = gross * (1 - TRANSACTION_FEE);

    let stripePayoutId: string | null = null;

    // Pay via Stripe Connect if account exists
    if (tipster.stripeAccountId && net >= 1) { // Minimum €1 payout
      try {
        const stripe = getStripe();
        const transfer = await stripe.transfers.create({
          amount: Math.round(net * 100), // cents
          currency: 'eur',
          destination: tipster.stripeAccountId,
          transfer_group: `commission_${year}_${month}`,
          metadata: {
            tipster_alias: tipster.alias,
            rank: i + 1,
            period: `${year}-${month}`,
          }
        });
        stripePayoutId = transfer.id;
        totalPaid += net;
      } catch (stripeError) {
        console.error(`Stripe transfer failed for ${tipster.alias}:`, stripeError);
      }
    }

    // Record commission in database
    await supabaseAdmin
      .from('monthly_commissions')
      .upsert({
        profile_id: tipster.profileId,
        period_year: year,
        period_month: month,
        rank: i + 1,
        roi_pct: tipster.roi,
        tip_count: tipster.tipCount,
        pool_share_pct: sharePercent * 100,
        gross_amount: gross,
        net_amount: net,
        paid_at: stripePayoutId ? new Date().toISOString() : null,
        stripe_payout_id: stripePayoutId,
      }, {
        onConflict: 'profile_id,period_year,period_month'
      });

    commissions.push({
      alias: tipster.alias,
      rank: i + 1,
      roi: tipster.roi,
      tipCount: tipster.tipCount,
      amount: net
    });
  }

  console.log(`Paid ${commissions.length} tipsters, total: €${totalPaid.toFixed(2)}`);

  return {
    totalPaid,
    tipstersPaid: commissions.length,
    commissions
  };
}

async function getMonthlyGrossRevenue(year: number, month: number): Promise<number> {
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59);

  // Sum all active subscription payments in the period
  const supabaseAdmin = getSupabaseAdmin();
  const { data: subscriptions, error } = await supabaseAdmin
    .from('subscriptions')
    .select('price_amount, currency')
    .eq('status', 'active')
    .gte('current_period_start', periodStart.toISOString())
    .lte('current_period_start', periodEnd.toISOString());

  if (error || !subscriptions) {
    console.error('Failed to fetch subscriptions for revenue:', error);
    return 0;
  }

  // Convert all to EUR (rough conversion for now)
  const exchangeRates: Record<string, number> = {
    eur: 1,
    usd: 0.92,
    gbp: 1.17
  };

  let totalEur = 0;
  for (const sub of subscriptions) {
    const rate = exchangeRates[sub.currency] || 1;
    totalEur += (sub.price_amount / 100) * rate;
  }

  return totalEur;
}
