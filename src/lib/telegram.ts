// ============================================================
// TipstersKing - Telegram Bot Integration
// Webhook mode (NOT long polling)
// ============================================================

import { createClient } from '@supabase/supabase-js';
import type { 
  TelegramUpdate, 
  TelegramMessage, 
  TelegramCallbackQuery,
  MatchWithLeague 
} from '@/types/database';
import { validateTip, createTip, get90DayRoi, getTipsterBadge } from './tips';
import { getUpcomingMatchesForBot } from './api-football';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const VIP_CHANNEL_ID = process.env.TELEGRAM_VIP_CHANNEL_ID || '';
const FREE_CHANNEL_ID = process.env.TELEGRAM_FREE_CHANNEL_ID || '';

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
// Telegram API Client
// ============================================================

async function telegramApi(method: string, body: Record<string, any> = {}) {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!data.ok) {
    console.error(`Telegram API error (${method}):`, data);
    throw new Error(data.description || 'Telegram API error');
  }
  return data.result;
}

export async function sendMessage(chatId: number | string, text: string, options: any = {}) {
  return telegramApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    ...options
  });
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return telegramApi('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text
  });
}

export async function editMessageText(chatId: number | string, messageId: number, text: string, options: any = {}) {
  return telegramApi('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    ...options
  });
}

// ============================================================
// Conversation State (in-memory for simplicity, use Redis in production)
// ============================================================

interface TipConversation {
  step: 'match' | 'market' | 'odds' | 'confirm';
  matchId?: number;
  matchName?: string;
  market?: string;
  pick?: string;
  odds?: number;
  analysis?: string;
}

const conversations = new Map<number, TipConversation>();

// ============================================================
// Webhook Handler
// ============================================================

export async function handleTelegramUpdate(update: TelegramUpdate) {
  try {
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    } else if (update.message?.text) {
      await handleMessage(update.message);
    }
  } catch (error) {
    console.error('Error handling Telegram update:', error);
  }
}

// ============================================================
// Message Handlers
// ============================================================

async function handleMessage(message: TelegramMessage) {
  const chatId = message.chat.id;
  const text = message.text?.trim() || '';
  const userId = message.from.id;

  // Check if tipster is in a conversation
  const conv = conversations.get(userId);

  // Commands
  if (text.startsWith('/')) {
    const [command, ...args] = text.split(' ');

    switch (command.toLowerCase()) {
      case '/start':
        await handleStart(chatId, userId);
        break;

      case '/tip':
        await handleTipCommand(chatId, userId);
        break;

      case '/mystats':
        await handleMyStats(chatId, userId);
        break;

      case '/cancel':
        if (args[0]) {
          await handleCancelTip(chatId, userId, parseInt(args[0]));
        } else {
          await sendMessage(chatId, '⚠️ Usage: /cancel [tip_id]');
        }
        break;

      case '/help':
        await handleHelp(chatId);
        break;

      default:
        await sendMessage(chatId, '❓ Unknown command. Use /help for available commands.');
    }
    return;
  }

  // Handle conversation input (odds entry)
  if (conv?.step === 'odds') {
    const odds = parseFloat(text);
    if (isNaN(odds) || odds < 1.30 || odds > 10.00) {
      await sendMessage(chatId, '⚠️ Invalid odds. Please enter a number between 1.30 and 10.00');
      return;
    }
    conv.odds = odds;
    conv.step = 'confirm';
    conversations.set(userId, conv);

    await showTipConfirmation(chatId, conv);
    return;
  }
}

// ============================================================
// Callback Query Handlers
// ============================================================

async function handleCallbackQuery(query: TelegramCallbackQuery) {
  const userId = query.from.id;
  const chatId = query.message?.chat.id;
  const messageId = query.message?.message_id;
  const data = query.data || '';

  if (!chatId || !messageId) return;

  await answerCallbackQuery(query.id);

  // Parse callback data
  const [action, ...params] = data.split(':');

  switch (action) {
    case 'match':
      await handleMatchSelection(chatId, messageId, userId, parseInt(params[0]));
      break;

    case 'market':
      await handleMarketSelection(chatId, messageId, userId, params[0], params[1]);
      break;

    case 'confirm':
      await handleTipConfirmation(chatId, messageId, userId, query.message!.date);
      break;

    case 'cancel_tip':
      conversations.delete(userId);
      await editMessageText(chatId, messageId, '❌ Tip cancelled.');
      break;

    case 'league':
      await showMatchesForLeague(chatId, messageId, params[0]);
      break;
  }
}

// ============================================================
// Command Handlers
// ============================================================

async function handleStart(chatId: number, telegramUserId: number) {
  // Check if user is a registered tipster
  const { data: tipster } = await db()
    .from('tipster_profiles')
    .select('alias, application_status')
    .eq('telegram_chat_id', telegramUserId)
    .single();

  if (tipster?.application_status === 'approved') {
    await sendMessage(chatId, 
      `👋 Welcome back, <b>${tipster.alias}</b>!\n\n` +
      `Use /tip to submit a new tip\n` +
      `Use /mystats to see your performance\n` +
      `Use /help for all commands`
    );
  } else if (tipster?.application_status === 'pending') {
    await sendMessage(chatId,
      '⏳ Your tipster application is pending review.\n\n' +
      'We\'ll notify you once approved!'
    );
  } else {
    await sendMessage(chatId,
      '👑 <b>TipstersKing Bot</b>\n\n' +
      'Want to become a tipster? Apply at:\n' +
      'https://tipstersking.com/apply\n\n' +
      'Already a subscriber? Real-time tips are posted in our VIP channel.'
    );
  }
}

async function handleTipCommand(chatId: number, telegramUserId: number) {
  // Verify tipster is approved
  const { data: tipster } = await db()
    .from('tipster_profiles')
    .select('profile_id, alias, application_status, active')
    .eq('telegram_chat_id', telegramUserId)
    .single();

  if (!tipster || tipster.application_status !== 'approved' || !tipster.active) {
    await sendMessage(chatId, '⚠️ You must be an approved tipster to submit tips.');
    return;
  }

  // Get upcoming matches grouped by league
  const matches = await getUpcomingMatchesForBot(48);

  if (matches.length === 0) {
    await sendMessage(chatId, '😕 No upcoming matches in the next 48 hours.');
    return;
  }

  // Group by league
  type MatchType = typeof matches[number];
  const byLeague = matches.reduce((acc: Record<string, MatchType[]>, m: MatchType) => {
    const league = (m.leagues as any)?.name || 'Other';
    if (!acc[league]) acc[league] = [];
    acc[league].push(m);
    return acc;
  }, {} as Record<string, MatchType[]>);

  // Show league selection first
  const buttons = Object.keys(byLeague).slice(0, 10).map(league => ([{
    text: `⚽ ${league} (${byLeague[league].length})`,
    callback_data: `league:${league}`
  }]));

  conversations.set(telegramUserId, { step: 'match' });

  await sendMessage(chatId,
    '📅 <b>Select a league:</b>',
    { reply_markup: { inline_keyboard: buttons } }
  );
}

async function showMatchesForLeague(chatId: number, messageId: number, leagueName: string) {
  const matches = await getUpcomingMatchesForBot(48);
  const leagueMatches = matches.filter((m: any) => (m.leagues as any)?.name === leagueName);

  if (leagueMatches.length === 0) {
    await editMessageText(chatId, messageId, '😕 No matches available for this league.');
    return;
  }

  const buttons = leagueMatches.slice(0, 8).map((m: any) => {
    const kickoff = new Date(m.kickoff_time);
    const deadline = new Date(m.deadline);
    const timeStr = kickoff.toLocaleString('en-GB', { 
      weekday: 'short',
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'CET'
    });

    return [{
      text: `${m.home_team} vs ${m.away_team} • ${timeStr}`,
      callback_data: `match:${m.id}`
    }];
  });

  buttons.push([{ text: '⬅️ Back', callback_data: 'tip_back' }]);

  await editMessageText(chatId, messageId,
    `⚽ <b>${leagueName}</b>\n\nSelect a match:`,
    { reply_markup: { inline_keyboard: buttons } }
  );
}

async function handleMatchSelection(chatId: number, messageId: number, userId: number, matchId: number) {
  // Fetch match details
  const { data: match } = await db()
    .from('matches')
    .select('*, leagues(name)')
    .eq('id', matchId)
    .single();

  if (!match) {
    await editMessageText(chatId, messageId, '⚠️ Match not found.');
    return;
  }

  const kickoff = new Date(match.kickoff_time);
  const deadline = new Date(match.deadline);
  const now = new Date();
  const timeLeft = Math.floor((deadline.getTime() - now.getTime()) / 60000);

  if (timeLeft <= 0) {
    await editMessageText(chatId, messageId, '⚠️ Deadline has passed for this match.');
    return;
  }

  const conv = conversations.get(userId) || { step: 'market' };
  conv.matchId = matchId;
  conv.matchName = `${match.home_team} vs ${match.away_team}`;
  conv.step = 'market';
  conversations.set(userId, conv);

  const marketButtons = [
    [
      { text: '🏠 Home Win', callback_data: `market:1X2:home` },
      { text: '🤝 Draw', callback_data: `market:1X2:draw` },
      { text: '✈️ Away Win', callback_data: `market:1X2:away` },
    ],
    [
      { text: '⬆️ Over 2.5', callback_data: `market:over_2.5:over` },
      { text: '⬇️ Under 2.5', callback_data: `market:under_2.5:under` },
    ],
    [
      { text: '✅ BTTS Yes', callback_data: `market:btts_yes:yes` },
      { text: '❌ BTTS No', callback_data: `market:btts_no:no` },
    ],
    [{ text: '🚫 Cancel', callback_data: 'cancel_tip' }]
  ];

  await editMessageText(chatId, messageId,
    `⚽ <b>${match.home_team} vs ${match.away_team}</b>\n` +
    `🏆 ${(match.leagues as any)?.name || ''}\n` +
    `📅 ${kickoff.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'CET' })} CET\n\n` +
    `⏰ <b>Deadline in ${timeLeft} minutes</b>\n\n` +
    `Select your pick:`,
    { reply_markup: { inline_keyboard: marketButtons } }
  );
}

async function handleMarketSelection(chatId: number, messageId: number, userId: number, marketType: string, pick: string) {
  const conv = conversations.get(userId);
  if (!conv || !conv.matchId) {
    await editMessageText(chatId, messageId, '⚠️ Session expired. Use /tip to start again.');
    return;
  }

  conv.market = marketType;
  conv.pick = pick;
  conv.step = 'odds';
  conversations.set(userId, conv);

  await editMessageText(chatId, messageId,
    `⚽ <b>${conv.matchName}</b>\n` +
    `📌 Pick: <b>${formatPick(marketType, pick)}</b>\n\n` +
    `💰 Enter the odds (1.30 - 10.00):`,
    { reply_markup: { inline_keyboard: [[{ text: '🚫 Cancel', callback_data: 'cancel_tip' }]] } }
  );
}

async function showTipConfirmation(chatId: number, conv: TipConversation) {
  await sendMessage(chatId,
    `📝 <b>Confirm your tip:</b>\n\n` +
    `⚽ ${conv.matchName}\n` +
    `📌 Pick: <b>${formatPick(conv.market!, conv.pick!)}</b>\n` +
    `💰 Odds: <b>${conv.odds}</b>\n\n` +
    `⚠️ Tips are <b>LOCKED</b> after confirmation and cannot be changed.`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ CONFIRM TIP', callback_data: 'confirm:yes' }],
          [{ text: '🚫 Cancel', callback_data: 'cancel_tip' }]
        ]
      }
    }
  );
}

async function handleTipConfirmation(chatId: number, messageId: number, userId: number, telegramTimestamp: number) {
  const conv = conversations.get(userId);
  if (!conv || !conv.matchId || !conv.market || !conv.pick || !conv.odds) {
    await editMessageText(chatId, messageId, '⚠️ Session expired. Use /tip to start again.');
    return;
  }

  // Get tipster profile
  const { data: tipster } = await db()
    .from('tipster_profiles')
    .select('profile_id, alias')
    .eq('telegram_chat_id', userId)
    .single();

  if (!tipster) {
    await editMessageText(chatId, messageId, '⚠️ Tipster profile not found.');
    return;
  }

  // Create the tip using SERVER timestamp
  const result = await createTip({
    profileId: tipster.profile_id,
    matchId: conv.matchId,
    marketType: conv.market,
    pick: conv.pick,
    odds: conv.odds,
    tipTimestamp: telegramTimestamp, // CRITICAL: Use Telegram server time
    analysis: conv.analysis
  });

  if (!result.success) {
    const errorMessages: Record<string, string> = {
      'MATCH_NOT_FOUND': 'Match not found',
      'MATCH_NOT_UPCOMING': 'Match has already started',
      'DEADLINE_PASSED': '⏰ Deadline has passed! Tips must be submitted 60 minutes before kickoff.',
      'ODDS_OUT_OF_RANGE': 'Odds must be between 1.30 and 10.00',
      'DUPLICATE_TIP': 'You already have a tip on this match/market',
      'TIPSTER_NOT_APPROVED': 'Your account is not approved for tips',
    };

    await editMessageText(chatId, messageId, `❌ ${errorMessages[result.error!] || result.error}`);
    conversations.delete(userId);
    return;
  }

  // Get tipster stats for the message
  const stats = await get90DayRoi(tipster.profile_id);
  const badge = await getTipsterBadge(tipster.profile_id);

  // Format tip message for VIP channel
  const { data: match } = await db()
    .from('matches')
    .select('*, leagues(name)')
    .eq('id', conv.matchId)
    .single();

  const kickoff = match ? new Date(match.kickoff_time) : new Date();
  const tipMessage = formatTipMessage({
    alias: tipster.alias,
    badge,
    roi: stats?.roi_pct || 0,
    homeTeam: match?.home_team || '',
    awayTeam: match?.away_team || '',
    league: (match?.leagues as any)?.name || '',
    kickoff,
    pick: formatPick(conv.market!, conv.pick!),
    odds: conv.odds,
    timestamp: new Date(telegramTimestamp * 1000)
  });

  // Post to VIP channel immediately
  const vipMsg = await sendMessage(VIP_CHANNEL_ID, tipMessage);

  // Update tip with telegram message ID
  await db()
    .from('tips')
    .update({ telegram_msg_id: vipMsg.message_id })
    .eq('id', result.tip!.id);

  // Confirm to tipster
  await editMessageText(chatId, messageId,
    `✅ <b>Tip submitted!</b>\n\n` +
    `⚽ ${conv.matchName}\n` +
    `📌 ${formatPick(conv.market!, conv.pick!)}\n` +
    `💰 Odds: ${conv.odds}\n\n` +
    `🔒 Locked at ${new Date(telegramTimestamp * 1000).toISOString()}`
  );

  conversations.delete(userId);
}

async function handleMyStats(chatId: number, telegramUserId: number) {
  const { data: tipster } = await db()
    .from('tipster_profiles')
    .select('profile_id, alias')
    .eq('telegram_chat_id', telegramUserId)
    .single();

  if (!tipster) {
    await sendMessage(chatId, '⚠️ Tipster profile not found.');
    return;
  }

  const stats = await get90DayRoi(tipster.profile_id);
  const badge = await getTipsterBadge(tipster.profile_id);

  if (!stats) {
    await sendMessage(chatId, '📊 No settled tips yet. Keep tipping!');
    return;
  }

  // Get monthly rank
  const now = new Date();
  const { data: commission } = await db()
    .from('monthly_commissions')
    .select('rank, roi_pct')
    .eq('profile_id', tipster.profile_id)
    .eq('period_year', now.getFullYear())
    .eq('period_month', now.getMonth() + 1)
    .single();

  const badgeEmoji = badge === 'established' ? '🟢' : badge === 'rising' ? '🟡' : '🔴';

  await sendMessage(chatId,
    `📊 <b>Your Stats (90 days)</b>\n\n` +
    `👤 <b>${tipster.alias}</b> ${badgeEmoji} ${badge}\n\n` +
    `📈 ROI: <b>${stats.roi_pct >= 0 ? '+' : ''}${stats.roi_pct.toFixed(1)}%</b>\n` +
    `🎯 Win Rate: <b>${stats.win_rate.toFixed(1)}%</b>\n` +
    `📝 Tips: <b>${stats.tip_count}</b>\n` +
    `💰 Profit: <b>${stats.profit_units >= 0 ? '+' : ''}${stats.profit_units.toFixed(2)} units</b>\n\n` +
    (commission ? `🏆 Monthly Rank: <b>#${commission.rank}</b>` : '📅 Not ranked this month yet')
  );
}

async function handleCancelTip(chatId: number, telegramUserId: number, tipId: number) {
  // Get tipster
  const { data: tipster } = await db()
    .from('tipster_profiles')
    .select('profile_id')
    .eq('telegram_chat_id', telegramUserId)
    .single();

  if (!tipster) {
    await sendMessage(chatId, '⚠️ Tipster profile not found.');
    return;
  }

  // Get tip and check deadline
  const { data: tip } = await db()
    .from('tips')
    .select('id, match_id, status, matches(deadline)')
    .eq('id', tipId)
    .eq('profile_id', tipster.profile_id)
    .single();

  if (!tip) {
    await sendMessage(chatId, '⚠️ Tip not found or not yours.');
    return;
  }

  if (tip.status !== 'pending') {
    await sendMessage(chatId, '⚠️ Only pending tips can be cancelled.');
    return;
  }

  const deadline = new Date((tip.matches as any).deadline);
  if (new Date() > deadline) {
    await sendMessage(chatId, '⚠️ Cannot cancel after deadline has passed.');
    return;
  }

  // NOTE: Tips are immutable - we can only void them, not delete
  // This requires admin override of the immutability trigger
  await sendMessage(chatId, 
    '⚠️ Tips cannot be deleted after submission.\n\n' +
    'This is to ensure leaderboard integrity.\n' +
    'Contact support if you believe there\'s an error.'
  );
}

async function handleHelp(chatId: number) {
  await sendMessage(chatId,
    '👑 <b>TipstersKing Bot Commands</b>\n\n' +
    '/tip - Submit a new tip\n' +
    '/mystats - View your performance stats\n' +
    '/cancel [id] - Cancel a tip (before deadline only)\n' +
    '/help - Show this message\n\n' +
    '📋 <b>Rules:</b>\n' +
    '• Tips must be submitted 60+ minutes before kickoff\n' +
    '• Odds must be between 1.30 and 10.00\n' +
    '• Tips cannot be edited or deleted after submission\n' +
    '• Minimum 30 tips/month + positive ROI for commissions'
  );
}

// ============================================================
// Helpers
// ============================================================

function formatPick(marketType: string, pick: string): string {
  const pickMap: Record<string, string> = {
    '1X2:home': 'Home Win',
    '1X2:draw': 'Draw',
    '1X2:away': 'Away Win',
    'over_2.5:over': 'Over 2.5 Goals',
    'under_2.5:under': 'Under 2.5 Goals',
    'btts_yes:yes': 'Both Teams to Score - Yes',
    'btts_no:no': 'Both Teams to Score - No',
  };
  return pickMap[`${marketType}:${pick}`] || `${marketType} - ${pick}`;
}

interface TipMessageParams {
  alias: string;
  badge: string;
  roi: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoff: Date;
  pick: string;
  odds: number;
  timestamp: Date;
  analysis?: string;
}

function formatTipMessage(params: TipMessageParams): string {
  const badgeEmoji = params.badge === 'established' ? '🟢' : params.badge === 'rising' ? '🟡' : '🔴';
  const kickoffStr = params.kickoff.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'CET'
  });

  let message = 
    `👑 <b>${params.alias}</b>\n` +
    `${badgeEmoji} ${params.badge.charAt(0).toUpperCase() + params.badge.slice(1)} | ROI ${params.roi >= 0 ? '+' : ''}${params.roi.toFixed(1)}%\n\n` +
    `⚽ <b>${params.homeTeam} vs ${params.awayTeam}</b>\n` +
    `🏆 ${params.league} | 📅 ${kickoffStr} CET\n\n` +
    `📌 Pick: <b>${params.pick}</b>\n` +
    `💰 Odds: <b>${params.odds}</b>\n`;

  if (params.analysis) {
    message += `\n📝 ${params.analysis}\n`;
  }

  message += `\n🔒 Locked at ${params.timestamp.toISOString()}\n\n` +
    `#TipstersKing`;

  return message;
}

// ============================================================
// Channel Access Management
// ============================================================

export async function addUserToVipChannel(telegramUserId: number) {
  try {
    // Unban (in case they were banned before) - this allows them to join
    await telegramApi('unbanChatMember', {
      chat_id: VIP_CHANNEL_ID,
      user_id: telegramUserId,
      only_if_banned: true
    });

    // Create invite link
    const invite = await telegramApi('createChatInviteLink', {
      chat_id: VIP_CHANNEL_ID,
      member_limit: 1,
      expire_date: Math.floor(Date.now() / 1000) + 86400 // 24h expiry
    });

    return invite.invite_link;
  } catch (error) {
    console.error('Failed to add user to VIP channel:', error);
    return null;
  }
}

export async function removeUserFromVipChannel(telegramUserId: number) {
  try {
    await telegramApi('banChatMember', {
      chat_id: VIP_CHANNEL_ID,
      user_id: telegramUserId,
      revoke_messages: false
    });
    return true;
  } catch (error) {
    console.error('Failed to remove user from VIP channel:', error);
    return false;
  }
}

// ============================================================
// Free Channel Publisher (called by cron)
// ============================================================

export async function publishToFreeChannel(): Promise<number> {
  const now = new Date();

  // Get tips scheduled for free channel that haven't been published
  // Using simple query to avoid PostgREST nested join issues
  const { data: queue, error } = await db()
    .from('free_channel_queue')
    .select('id, tip_id, scheduled_at')
    .lte('scheduled_at', now.toISOString())
    .is('published_at', null)
    .eq('skipped', false)
    .limit(10);

  if (error || !queue?.length) return 0;

  let published = 0;

  for (const item of queue) {
    try {
      // Fetch tip with match data separately to avoid nested join issues
      const { data: tip, error: tipError } = await db()
        .from('tips')
        .select('id, market_type, pick, odds, tip_timestamp, profile_id, match_id')
        .eq('id', item.tip_id)
        .single();

      if (tipError) {
        console.error('Failed to fetch tip:', tipError.message);
        continue;
      }

      if (!tip) {
        await db()
          .from('free_channel_queue')
          .update({ skipped: true, skip_reason: 'Tip not found' })
          .eq('id', item.id);
        continue;
      }

      // Fetch match separately
      const { data: match, error: matchError } = await db()
        .from('matches')
        .select('id, home_team, away_team, kickoff_time, status, leagues(name)')
        .eq('id', tip.match_id)
        .single();

      if (matchError) {
        console.error('Failed to fetch match:', matchError.message);
        continue;
      }

      // Skip if match already kicked off
      if (!match || match.status !== 'upcoming') {
        await db()
          .from('free_channel_queue')
          .update({ skipped: true, skip_reason: 'Match already started' })
          .eq('id', item.id);
        continue;
      }

      const kickoff = new Date(match.kickoff_time);
      if (kickoff <= now) {
        await db()
          .from('free_channel_queue')
          .update({ skipped: true, skip_reason: 'Past kickoff time' })
          .eq('id', item.id);
        continue;
      }

      // Get tipster stats and alias
      const stats = await get90DayRoi(tip.profile_id);
      const badge = await getTipsterBadge(tip.profile_id);
      
      // Fetch alias
      const { data: tipsterData } = await db()
        .from('tipster_profiles')
        .select('alias')
        .eq('profile_id', tip.profile_id)
        .single();
      const alias = tipsterData?.alias || 'Anonymous';

      // Format and publish
      const message = formatTipMessage({
        alias,
        badge,
        roi: stats?.roi_pct || 0,
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        league: match.leagues?.name || '',
        kickoff,
        pick: formatPick(tip.market_type, tip.pick),
        odds: tip.odds,
        timestamp: new Date(tip.tip_timestamp)
      });

      await sendMessage(FREE_CHANNEL_ID, message + '\n\n🆓 <i>Free channel - 2h delay</i>');
      
      await db()
        .from('free_channel_queue')
        .update({ published_at: now.toISOString() })
        .eq('id', item.id);

      published++;
    } catch (err) {
      console.error('Failed to publish to free channel:', err);
    }
  }

  return published;
}
