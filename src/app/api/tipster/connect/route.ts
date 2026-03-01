// ============================================================
// Stripe Connect API for Tipsters
// POST: Create Connect account + onboarding link
// GET: Check Connect account status
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

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

// GET: Check Connect account status
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const supabase = getSupabaseAdmin();
    
    // Get tipster profile
    const { data: tipster, error: tipsterError } = await supabase
      .from('tipster_profiles')
      .select('stripe_account_id, alias')
      .eq('profile_id', user.id)
      .single();
    
    if (tipsterError || !tipster) {
      return NextResponse.json({ error: 'Tipster profile not found' }, { status: 404 });
    }
    
    if (!tipster.stripe_account_id) {
      return NextResponse.json({
        connected: false,
        accountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      });
    }
    
    // Get account status from Stripe
    const account = await stripe.accounts.retrieve(tipster.stripe_account_id);
    
    return NextResponse.json({
      connected: true,
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      email: account.email,
      country: account.country,
    });
    
  } catch (error) {
    console.error('Connect status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create Connect account or get onboarding link
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const supabase = getSupabaseAdmin();
    
    // Get tipster profile
    const { data: tipster, error: tipsterError } = await supabase
      .from('tipster_profiles')
      .select('stripe_account_id, alias, profile_id')
      .eq('profile_id', user.id)
      .single();
    
    if (tipsterError || !tipster) {
      return NextResponse.json({ error: 'Tipster profile not found' }, { status: 404 });
    }
    
    // Get profile email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();
    
    let accountId = tipster.stripe_account_id;
    
    // Create new Connect account if needed
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: profile?.email || user.email,
        metadata: {
          profile_id: user.id,
          alias: tipster.alias,
        },
        capabilities: {
          transfers: { requested: true },
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'manual', // We'll trigger payouts monthly
            },
          },
        },
      });
      
      accountId = account.id;
      
      // Save to database
      await supabase
        .from('tipster_profiles')
        .update({ stripe_account_id: accountId })
        .eq('profile_id', user.id);
    }
    
    // Check if account needs onboarding
    const account = await stripe.accounts.retrieve(accountId);
    
    if (account.details_submitted && account.payouts_enabled) {
      // Already fully set up
      return NextResponse.json({
        success: true,
        accountId,
        alreadyComplete: true,
        message: 'Payouts already configured',
      });
    }
    
    // Create onboarding link
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://tipstersking.com';
    
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/dashboard/tipster?connect=refresh`,
      return_url: `${baseUrl}/dashboard/tipster?connect=success`,
      type: 'account_onboarding',
    });
    
    return NextResponse.json({
      success: true,
      accountId,
      onboardingUrl: accountLink.url,
    });
    
  } catch (error) {
    console.error('Connect create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
