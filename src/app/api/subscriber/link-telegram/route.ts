// ============================================================
// Telegram Linking API
// POST: Generate linking code for Telegram bot
// GET: Check linking status
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import crypto from 'crypto';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
  
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export const dynamic = 'force-dynamic';

// POST: Generate a linking code
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const supabase = getSupabaseAdmin();
    
    // Check if user has active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('profile_id', user.id)
      .in('status', ['active', 'trialing'])
      .single();
    
    if (!subscription) {
      return NextResponse.json(
        { error: 'Active subscription required' },
        { status: 403 }
      );
    }
    
    // Generate a unique linking code (6 chars)
    const linkCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min expiry
    
    // Ensure subscriber_profiles exists
    await supabase
      .from('subscriber_profiles')
      .upsert({
        profile_id: user.id,
      }, { onConflict: 'profile_id' });
    
    // Store linking code (we'll use a simple approach with metadata table)
    // For now, store in subscriber_profiles with a temp field
    // In production, use a separate telegram_link_codes table
    
    // Return the code and bot username
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'TipstersKingBot';
    
    return NextResponse.json({
      linkCode,
      expiresAt: expiresAt.toISOString(),
      botUsername,
      deepLink: `https://t.me/${botUsername}?start=link_${linkCode}_${user.id}`,
    });
    
  } catch (error) {
    console.error('Link telegram error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: Check if telegram is linked
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const supabase = getSupabaseAdmin();
    
    const { data: subscriberProfile } = await supabase
      .from('subscriber_profiles')
      .select('telegram_user_id, telegram_username')
      .eq('profile_id', user.id)
      .single();
    
    return NextResponse.json({
      linked: !!subscriberProfile?.telegram_user_id,
      telegramUsername: subscriberProfile?.telegram_username || null,
    });
    
  } catch (error) {
    console.error('Check telegram link error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
