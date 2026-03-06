// ============================================================
// Account Setup API
// POST: Complete account setup with password
// GET: Validate setup token and get session info
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import * as crypto from 'crypto';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-01-28.clover",
  });
}

export const dynamic = 'force-dynamic';

// GET: Validate session_id or setup token
export async function GET(request: NextRequest) {
  console.log('Setup GET called');
  
  const sessionId = request.nextUrl.searchParams.get('session_id');
  const token = request.nextUrl.searchParams.get('token');
  
  console.log('Params:', { sessionId: sessionId?.slice(0, 20), token: token?.slice(0, 10) });
  
  const supabase = getSupabaseAdmin();
  
  // Method 1: Via Stripe session_id (from success page redirect)
  if (sessionId) {
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      // Validate session - accept 'paid' or 'no_payment_required' (for trials)
      const validPayment = session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
      const validStatus = session.status === 'complete';
      
      if (!session || (!validPayment && !validStatus)) {
        console.error('Invalid session:', { payment_status: session?.payment_status, status: session?.status });
        return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
      }
      
      const email = session.customer_email || session.customer_details?.email;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      
      if (!email) {
        return NextResponse.json({ error: 'No email found' }, { status: 400 });
      }
      
      // Get profile_id from Stripe customer metadata
      const customer = await stripe.customers.retrieve(customerId);
      let profileId = (customer as any).metadata?.profile_id;
      
      // If webhook hasn't processed yet, create user now
      if (!profileId) {
        // Check if user exists by email
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find((u: any) => u.email === email);
        
        if (existingUser) {
          profileId = existingUser.id;
        } else {
          // Create new user
          const tempPassword = crypto.randomUUID();
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              needs_password_setup: true,
              stripe_customer_id: customerId
            }
          });
          
          if (createError || !newUser?.user) {
            console.error('Failed to create user in setup:', createError);
            return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
          }
          
          profileId = newUser.user.id;
          
          // Create profile
          await supabase.from('profiles').upsert({
            id: profileId,
            created_at: new Date().toISOString()
          }, { onConflict: 'id' });
        }
        
        // Update Stripe customer with profile_id
        await stripe.customers.update(customerId, {
          metadata: { profile_id: profileId }
        });
        
        // Create subscriber_profiles
        await supabase.from('subscriber_profiles').upsert({
          profile_id: profileId,
          subscribed_at: new Date().toISOString()
        }, { onConflict: 'profile_id' });
      }
      
      // ALWAYS create subscription record (moved outside the if block)
      if (subscriptionId) {
        // Check if subscription already exists
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('stripe_subscription_id', subscriptionId)
          .single();
        
        if (!existingSub) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceItem = subscription.items.data[0];
          const sub = subscription as any;
          
          const { error: subError } = await supabase.from('subscriptions').upsert({
            profile_id: profileId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status: subscription.status === 'trialing' ? 'trialing' : 'active',
            price_amount: priceItem?.price?.unit_amount || 999,
            currency: priceItem?.price?.currency || 'eur',
            current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
            current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          }, { onConflict: 'stripe_subscription_id' });
          
          if (subError) {
            console.error('Failed to create subscription:', subError);
          } else {
            console.log('Subscription created:', subscriptionId);
          }
        }
      }
      
      // Check if account already has password set
      const { data: userData } = await supabase.auth.admin.getUserById(profileId);
      const needsPassword = userData?.user?.user_metadata?.needs_password_setup === true;
      
      // Get subscription status
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status, stripe_subscription_id')
        .eq('profile_id', profileId)
        .single();
      
      // Get Telegram linking status
      const { data: subscriberProfile } = await supabase
        .from('subscriber_profiles')
        .select('telegram_user_id, telegram_username')
        .eq('profile_id', profileId)
        .single();
      
      return NextResponse.json({
        valid: true,
        email,
        profileId,
        needsPassword,
        subscriptionStatus: subscription?.status || 'active',
        telegramLinked: !!subscriberProfile?.telegram_user_id,
        telegramUsername: subscriberProfile?.telegram_username || null,
      });
      
    } catch (error: any) {
      console.error('Session validation error:', error);
      return NextResponse.json({ 
        error: 'Session validation failed', 
        details: error?.message || String(error)
      }, { status: 400 });
    }
  }
  
  // Method 2: Via setup token (from email link)
  if (token) {
    const { data: tokenData } = await supabase
      .from('setup_tokens')
      .select('*')
      .eq('token', token)
      .single();
    
    if (!tokenData) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }
    
    if (tokenData.used) {
      return NextResponse.json({ error: 'Token already used' }, { status: 400 });
    }
    
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Token expired' }, { status: 400 });
    }
    
    return NextResponse.json({
      valid: true,
      email: tokenData.email,
      profileId: tokenData.profile_id,
      needsPassword: true,
    });
  }
  
  return NextResponse.json({ error: 'Missing session_id or token' }, { status: 400 });
}

// POST: Complete account setup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, token, password, username } = body;
    
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    let profileId: string;
    let email: string;
    
    // Get profile from session or token
    if (sessionId) {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      email = session.customer_email || session.customer_details?.email || '';
      
      const customer = await stripe.customers.retrieve(session.customer as string);
      profileId = (customer as any).metadata?.profile_id;
      
      if (!profileId) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 400 });
      }
    } else if (token) {
      const { data: tokenData } = await supabase
        .from('setup_tokens')
        .select('*')
        .eq('token', token)
        .eq('used', false)
        .single();
      
      if (!tokenData || new Date(tokenData.expires_at) < new Date()) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
      }
      
      profileId = tokenData.profile_id;
      email = tokenData.email;
      
      // Mark token as used
      await supabase
        .from('setup_tokens')
        .update({ used: true })
        .eq('token', token);
    } else {
      return NextResponse.json({ error: 'Missing session_id or token' }, { status: 400 });
    }
    
    // Update user password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      profileId,
      { 
        password,
        user_metadata: { 
          needs_password_setup: false,
          username: username || null
        }
      }
    );
    
    if (updateError) {
      console.error('Failed to update password:', updateError);
      return NextResponse.json({ error: 'Failed to set password' }, { status: 500 });
    }
    
    // Update profile with username if provided
    if (username) {
      await supabase
        .from('profiles')
        .update({ username })
        .eq('id', profileId);
    }
    
    // Generate a Telegram VIP invite link
    let telegramInvite = null;
    try {
      // Get subscriber's telegram_user_id if already linked
      const { data: subscriberProfile } = await supabase
        .from('subscriber_profiles')
        .select('telegram_user_id')
        .eq('profile_id', profileId)
        .single();
      
      // If not yet linked, generate a generic invite link they can use
      // The VIP channel will be accessible once they verify their Telegram
      // For now, just provide the channel info for manual join
      
      // Note: addUserToVipChannel requires telegram_user_id which we might not have yet
      // We'll provide the bot link for linking instead
    } catch (e) {
      console.error('Telegram invite error:', e);
    }
    
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'TipstersKingBot';
    
    return NextResponse.json({
      success: true,
      message: 'Account setup complete',
      email,
      telegramBotLink: `https://t.me/${botUsername}`,
      // They need to link their Telegram account first via the bot
    });
    
  } catch (error) {
    console.error('Account setup error:', error);
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 });
  }
}
