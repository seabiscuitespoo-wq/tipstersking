// ============================================================
// TipstersKing Database Types
// Auto-generated from schema - keep in sync with migrations
// ============================================================

export type UserRole = 'subscriber' | 'tipster' | 'admin';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing';
export type MatchStatus = 'upcoming' | 'live' | 'finished' | 'postponed' | 'cancelled';
export type TipStatus = 'pending' | 'won' | 'lost' | 'void';
export type MarketType = '1X2' | 'over_2.5' | 'under_2.5' | 'btts_yes' | 'btts_no';

// ============================================================
// Core Tables
// ============================================================

export interface Profile {
  id: string; // UUID
  username: string;
  display_name: string | null;
  email?: string;
  bio: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface TipsterProfile {
  id: number;
  profile_id: string;
  alias: string;
  stripe_account_id: string | null;
  telegram_chat_id: number | null;
  active: boolean;
  application_status: ApplicationStatus;
  application_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  approved_at: string | null;
  tip_count_total: number;
  created_at: string;
}

export interface SubscriberProfile {
  id: number;
  profile_id: string;
  telegram_user_id: number | null;
  telegram_username: string | null;
  subscribed_at: string | null;
  created_at: string;
}

export interface Subscription {
  id: number;
  profile_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  status: SubscriptionStatus;
  price_amount: number; // cents
  currency: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface League {
  id: number;
  api_football_id: number;
  name: string;
  country: string | null;
  logo_url: string | null;
  active: boolean;
  created_at: string;
}

export interface Match {
  id: number;
  api_football_id: number;
  league_id: number;
  home_team: string;
  away_team: string;
  home_team_logo: string | null;
  away_team_logo: string | null;
  kickoff_time: string;
  deadline: string;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  fetched_at: string;
}

export interface Tip {
  id: number;
  profile_id: string;
  match_id: number;
  market_type: MarketType | string;
  pick: string;
  odds: number;
  tip_timestamp: string;
  telegram_msg_id: number | null;
  status: TipStatus;
  analysis: string | null;
  created_at: string;
}

export interface MonthlyCommission {
  id: number;
  profile_id: string;
  period_year: number;
  period_month: number;
  rank: number | null;
  roi_pct: number | null;
  tip_count: number | null;
  pool_share_pct: number | null;
  gross_amount: number | null;
  net_amount: number | null;
  paid_at: string | null;
  stripe_payout_id: string | null;
  created_at: string;
}

export interface FreeChannelQueue {
  id: number;
  tip_id: number;
  scheduled_at: string;
  published_at: string | null;
  skipped: boolean;
  skip_reason: string | null;
  created_at: string;
}

// ============================================================
// Joined / Extended Types
// ============================================================

export interface TipsterWithProfile extends TipsterProfile {
  profile: Profile;
}

export interface ActiveTipster {
  profile_id: string;
  email: string;
  username: string;
  tipster_id: number;
  alias: string;
  stripe_account_id: string | null;
  telegram_chat_id: number | null;
  tip_count_total: number;
  approved_at: string | null;
}

export interface MatchWithLeague extends Match {
  league_name: string;
  league_country: string | null;
  league_logo: string | null;
}

export interface TipWithDetails extends Tip {
  match: MatchWithLeague;
  tipster: {
    alias: string;
    profile_id: string;
  };
}

// ============================================================
// API Response Types
// ============================================================

export interface RoiStats {
  roi_pct: number;
  win_rate: number;
  tip_count: number;
  profit_units: number;
}

export interface LeaderboardEntry {
  rank: number;
  profile_id: string;
  alias: string;
  roi_pct: number;
  win_rate: number;
  tip_count: number;
  badge: 'established' | 'rising' | 'inconsistent';
  monthly_roi?: number;
}

export interface TipValidationResult {
  valid: boolean;
  reason?: 
    | 'MATCH_NOT_FOUND'
    | 'MATCH_NOT_UPCOMING'
    | 'DEADLINE_PASSED'
    | 'ODDS_OUT_OF_RANGE'
    | 'TIPSTER_NOT_APPROVED'
    | 'DUPLICATE_TIP';
  match?: Match;
}

// ============================================================
// API-Football Types
// ============================================================

export interface ApiFootballFixture {
  fixture: {
    id: number;
    date: string;
    status: {
      short: string;
      long: string;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
    };
    away: {
      id: number;
      name: string;
      logo: string;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

export interface ApiFootballResponse {
  get: string;
  results: number;
  response: ApiFootballFixture[];
}

// ============================================================
// Telegram Types
// ============================================================

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  date: number; // Unix timestamp - THIS IS SERVER TIME
  text?: string;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
}

// ============================================================
// Commission Constants
// ============================================================

export const COMMISSION_SHARES = [0.25, 0.18, 0.13, 0.10, 0.08, 0.07, 0.06, 0.05, 0.04, 0.04] as const;
export const PLATFORM_CUT = 0.30; // 30%
export const TIPSTER_POOL = 0.70; // 70%
export const MIN_TIPS_FOR_COMMISSION = 30;
export const TRANSACTION_FEE = 0.02; // 2%

export const PRICE_IDS = {
  eur: process.env.STRIPE_PRICE_EUR || 'price_eur_xxx',
  usd: process.env.STRIPE_PRICE_USD || 'price_usd_xxx',
  gbp: process.env.STRIPE_PRICE_GBP || 'price_gbp_xxx',
} as const;

export const PRICES = {
  eur: 999, // €9.99
  usd: 999, // $9.99
  gbp: 899, // £8.99
} as const;

export type Currency = keyof typeof PRICES;
