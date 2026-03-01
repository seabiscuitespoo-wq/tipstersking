// ============================================================
// Telegram Bot Webhook
// Set webhook: https://api.telegram.org/bot{TOKEN}/setWebhook?url={YOUR_URL}/api/telegram/bot
// ============================================================

import { NextResponse } from 'next/server';
import { handleTelegramUpdate } from '@/lib/telegram';
import type { TelegramUpdate } from '@/types/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Verify webhook secret (optional but recommended)
    const webhookSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (process.env.TELEGRAM_WEBHOOK_SECRET && webhookSecret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      console.warn('Invalid Telegram webhook secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const update: TelegramUpdate = await request.json();
    
    // Process asynchronously to respond quickly
    // Telegram expects response within 60 seconds
    handleTelegramUpdate(update).catch(err => {
      console.error('Error processing Telegram update:', err);
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    bot: 'TipstersKing',
    timestamp: new Date().toISOString()
  });
}
