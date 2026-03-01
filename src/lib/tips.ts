// ============================================================
// TipstersKing - Core Tip Logic
// CRITICAL: This file contains anti-manipulation rules
// DO NOT modify validation logic without review
// ============================================================

import { createClient } from '@supabase/supabase-js';
import type { 
  TipValidationResult, 
  RoiStats, 
  Match,
  TipStatus,
  MarketType 
} from '@/types/database';

// Server-side Supabase client (lazy init to avoid build-time errors)
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
// TIP VALIDATION - ANTI-MANIPULATION CORE
// ============================================================

/**
 * Validates a tip before submission.
 * 
 * RULES (all must pass):
 * 1. Match must exist
 * 2. Match status must be 'upcoming'
 * 3. Tip timestamp <= match deadline (kickoff - 60min)
 * 4. Odds between 1.30 and 10.00
 * 5. Tipster must be approved
 * 6. No duplicate tips on same match/market
 * 
 * @param telegramTimestamp - Unix timestamp from Telegram SERVER (not device)
 * @param matchId - Database match ID
 * @param odds - Decimal odds (e.g., 2.10)
 * @param profileId - Tipster's profile UUID
 * @param marketType - Market type (1X2, over_2.5, etc.)
 */
export async function validateTip(
  telegramTimestamp: number,
  matchId: number,
  odds: number,
  profileId: string,
  marketType: string
): Promise<TipValidationResult> {
  
  // 1. Validate odds range FIRST (cheapest check)
  if (odds < 1.30 || odds > 10.00) {
    return { valid: false, reason: 'ODDS_OUT_OF_RANGE' };
  }

  // 2. Check tipster is approved
  const { data: tipster, error: tipsterError } = await db()
    .from('tipster_profiles')
    .select('application_status, active')
    .eq('profile_id', profileId)
    .single();

  if (tipsterError || !tipster) {
    return { valid: false, reason: 'TIPSTER_NOT_APPROVED' };
  }

  if (tipster.application_status !== 'approved' || !tipster.active) {
    return { valid: false, reason: 'TIPSTER_NOT_APPROVED' };
  }

  // 3. Fetch match
  const { data: match, error: matchError } = await db()
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (matchError || !match) {
    return { valid: false, reason: 'MATCH_NOT_FOUND' };
  }

  // 4. Check match status
  if (match.status !== 'upcoming') {
    return { valid: false, reason: 'MATCH_NOT_UPCOMING' };
  }

  // 5. Check deadline - CRITICAL ANTI-MANIPULATION
  const tipTime = new Date(telegramTimestamp * 1000);
  const deadline = new Date(match.deadline);

  if (tipTime > deadline) {
    return { valid: false, reason: 'DEADLINE_PASSED' };
  }

  // 6. Check for duplicate tips
  const { data: existingTip } = await db()
    .from('tips')
    .select('id')
    .eq('profile_id', profileId)
    .eq('match_id', matchId)
    .eq('market_type', marketType)
    .single();

  if (existingTip) {
    return { valid: false, reason: 'DUPLICATE_TIP' };
  }

  return { valid: true, match: match as Match };
}

// ============================================================
// TIP CREATION
// ============================================================

interface CreateTipParams {
  profileId: string;
  matchId: number;
  marketType: MarketType | string;
  pick: string;
  odds: number;
  tipTimestamp: number; // Telegram server timestamp
  telegramMsgId?: number;
  analysis?: string;
}

export async function createTip(params: CreateTipParams) {
  const {
    profileId,
    matchId,
    marketType,
    pick,
    odds,
    tipTimestamp,
    telegramMsgId,
    analysis
  } = params;

  // Validate first
  const validation = await validateTip(
    tipTimestamp,
    matchId,
    odds,
    profileId,
    marketType
  );

  if (!validation.valid) {
    return { success: false, error: validation.reason };
  }

  // Insert tip
  const { data: tip, error } = await db()
    .from('tips')
    .insert({
      profile_id: profileId,
      match_id: matchId,
      market_type: marketType,
      pick,
      odds,
      tip_timestamp: new Date(tipTimestamp * 1000).toISOString(),
      telegram_msg_id: telegramMsgId || null,
      analysis: analysis || null,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create tip:', error);
    return { success: false, error: 'DATABASE_ERROR' };
  }

  // Update tipster's total tip count
  await db().rpc('increment_tip_count', { p_profile_id: profileId });

  // Queue for free channel (120min delay)
  const scheduledAt = new Date(tipTimestamp * 1000 + 120 * 60 * 1000);
  
  await db()
    .from('free_channel_queue')
    .insert({
      tip_id: tip.id,
      scheduled_at: scheduledAt.toISOString()
    });

  return { success: true, tip };
}

// ============================================================
// ROI CALCULATION - ALWAYS 1 UNIT PER TIP
// ============================================================

/**
 * Calculate ROI for a tipster over a date range.
 * 
 * FORMULA (1 unit per tip):
 * - Won tip: profit = odds - 1
 * - Lost tip: profit = -1
 * - ROI = (total profit / total settled tips) * 100
 */
export async function calculateRoi(
  profileId: string,
  fromDate: Date,
  toDate: Date
): Promise<RoiStats | null> {
  
  const { data: tips, error } = await db()
    .from('tips')
    .select('status, odds')
    .eq('profile_id', profileId)
    .gte('tip_timestamp', fromDate.toISOString())
    .lte('tip_timestamp', toDate.toISOString())
    .in('status', ['won', 'lost']);

  if (error || !tips || tips.length === 0) {
    return null;
  }

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
    profit_units: profitUnits
  };
}

/**
 * Get 90-day rolling ROI for leaderboard
 */
export async function get90DayRoi(profileId: string): Promise<RoiStats | null> {
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 90);
  
  return calculateRoi(profileId, fromDate, toDate);
}

/**
 * Get monthly ROI for commission calculation
 */
export async function getMonthlyRoi(
  profileId: string,
  year: number,
  month: number
): Promise<RoiStats | null> {
  const fromDate = new Date(year, month - 1, 1);
  const toDate = new Date(year, month, 0, 23, 59, 59);
  
  return calculateRoi(profileId, fromDate, toDate);
}

// ============================================================
// TIP STATUS UPDATES (for cron jobs)
// ============================================================

/**
 * Update tip status based on match result.
 * Called by update-results cron.
 */
export async function updateTipStatuses(matchId: number, homeScore: number, awayScore: number) {
  // Fetch all pending tips for this match
  const { data: tips, error } = await db()
    .from('tips')
    .select('id, market_type, pick')
    .eq('match_id', matchId)
    .eq('status', 'pending');

  if (error || !tips) {
    console.error('Failed to fetch tips for match:', matchId, error);
    return;
  }

  const totalGoals = homeScore + awayScore;
  const bothScored = homeScore > 0 && awayScore > 0;

  for (const tip of tips) {
    let newStatus: TipStatus = 'pending';

    switch (tip.market_type) {
      case '1X2':
        if (tip.pick === 'home' && homeScore > awayScore) newStatus = 'won';
        else if (tip.pick === 'draw' && homeScore === awayScore) newStatus = 'won';
        else if (tip.pick === 'away' && awayScore > homeScore) newStatus = 'won';
        else newStatus = 'lost';
        break;

      case 'over_2.5':
        newStatus = totalGoals > 2.5 ? 'won' : 'lost';
        break;

      case 'under_2.5':
        newStatus = totalGoals < 2.5 ? 'won' : 'lost';
        break;

      case 'btts_yes':
        newStatus = bothScored ? 'won' : 'lost';
        break;

      case 'btts_no':
        newStatus = !bothScored ? 'won' : 'lost';
        break;

      default:
        console.warn(`Unknown market type: ${tip.market_type}`);
        continue;
    }

    // Update tip status (only status can be updated - immutability trigger allows this)
    await db()
      .from('tips')
      .update({ status: newStatus })
      .eq('id', tip.id);
  }
}

// ============================================================
// HELPER: Get tipster badge
// ============================================================

export type TipsterBadge = 'established' | 'rising' | 'inconsistent';

export async function getTipsterBadge(profileId: string): Promise<TipsterBadge> {
  const { data: tipster } = await db()
    .from('tipster_profiles')
    .select('tip_count_total, approved_at')
    .eq('profile_id', profileId)
    .single();

  if (!tipster) return 'rising';

  const tipCount = tipster.tip_count_total || 0;
  const approvedAt = tipster.approved_at ? new Date(tipster.approved_at) : new Date();
  const monthsActive = Math.floor(
    (Date.now() - approvedAt.getTime()) / (30 * 24 * 60 * 60 * 1000)
  );

  // 🟢 Established: 200+ tips AND 6+ months
  if (tipCount >= 200 && monthsActive >= 6) {
    return 'established';
  }

  // Check variance for inconsistent badge
  const { data: recentTips } = await db()
    .from('tips')
    .select('odds, status')
    .eq('profile_id', profileId)
    .gte('tip_timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .in('status', ['won', 'lost']);

  if (recentTips && recentTips.length >= 10) {
    // Calculate variance - high variance = inconsistent
    const profits = recentTips.map((t: any) => 
      t.status === 'won' ? Number(t.odds) - 1 : -1
    );
    const mean = profits.reduce((a: number, b: number) => a + b, 0) / profits.length;
    const variance = profits.reduce((sum: number, p: number) => sum + Math.pow(p - mean, 2), 0) / profits.length;
    
    // High variance threshold (can be tuned)
    if (variance > 2) {
      return 'inconsistent';
    }
  }

  // 🟡 Rising: default for < 200 tips or < 6 months
  return 'rising';
}
