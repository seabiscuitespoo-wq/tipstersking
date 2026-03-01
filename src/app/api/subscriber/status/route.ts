// ============================================================
// Subscriber Status API
// GET: Get subscriber's subscription and Telegram status
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const supabase = getSupabaseAdmin();
    
    // Get profile with subscriber data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, username, role')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    // Get subscriber profile (telegram linking)
    const { data: subscriberProfile } = await supabase
      .from('subscriber_profiles')
      .select('telegram_user_id, telegram_username, subscribed_at')
      .eq('profile_id', user.id)
      .single();
    
    // Get active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('profile_id', user.id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    // Determine VIP access
    const hasActiveSubscription = !!subscription && 
      ['active', 'trialing'].includes(subscription.status);
    
    const hasTelegramLinked = !!subscriberProfile?.telegram_user_id;
    
    return NextResponse.json({
      profile: {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        role: profile.role,
      },
      subscription: subscription ? {
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        cancelledAt: subscription.cancelled_at,
        priceAmount: subscription.price_amount,
        currency: subscription.currency,
      } : null,
      telegram: {
        linked: hasTelegramLinked,
        userId: subscriberProfile?.telegram_user_id || null,
        username: subscriberProfile?.telegram_username || null,
      },
      vipAccess: hasActiveSubscription && hasTelegramLinked,
    });
    
  } catch (error) {
    console.error('Subscriber status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
