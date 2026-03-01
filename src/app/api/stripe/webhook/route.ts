// ============================================================
// Stripe Webhook Handler
// Handles subscription lifecycle + Telegram access
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from '@supabase/supabase-js';
import { addUserToVipChannel, removeUserFromVipChannel, sendMessage } from '@/lib/telegram';

// Lazy initialization to avoid build-time errors
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Missing STRIPE_SECRET_KEY');
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-01-28.clover",
  });
};

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  const stripe = getStripe();
  
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(`Stripe webhook: ${event.type}`);

  try {
    switch (event.type) {
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`Error handling ${event.type}:`, error);
    // Still return 200 to prevent Stripe retries
  }

  return NextResponse.json({ received: true });
}

// ============================================================
// Event Handlers
// ============================================================

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { profile_id, telegram_user_id, telegram_username } = session.metadata || {};
  
  if (!profile_id) {
    console.warn('Checkout completed without profile_id in metadata');
    return;
  }

  console.log('Checkout completed:', {
    profile_id,
    telegram_user_id,
    customer: session.customer,
    subscription: session.subscription
  });

  // Create/update subscriber profile
  if (telegram_user_id) {
    await db()
      .from('subscriber_profiles')
      .upsert({
        profile_id,
        telegram_user_id: parseInt(telegram_user_id),
        telegram_username: telegram_username || null,
        subscribed_at: new Date().toISOString()
      }, {
        onConflict: 'profile_id'
      });

    // Send VIP channel invite
    const inviteLink = await addUserToVipChannel(parseInt(telegram_user_id));
    
    if (inviteLink) {
      await sendMessage(parseInt(telegram_user_id),
        `🎉 <b>Welcome to TipstersKing Premium!</b>\n\n` +
        `Your subscription is now active. Join the VIP channel for real-time tips:\n\n` +
        `👇 <b>Join here:</b>\n${inviteLink}\n\n` +
        `⚠️ This link expires in 24 hours.\n` +
        `Questions? Contact @TipstersKingSupport`
      );
    }
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  // Get customer to find profile
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return;

  const profileId = subscription.metadata?.profile_id;
  if (!profileId) {
    console.warn('Subscription created without profile_id');
    return;
  }

  // Get price details
  const priceItem = subscription.items.data[0];
  const priceAmount = priceItem?.price?.unit_amount || 999;
  const currency = priceItem?.price?.currency || 'eur';

  // Get period dates from subscription (handle API version differences)
  const sub = subscription as any;
  const periodStart = sub.current_period_start || sub.billing_cycle_anchor;
  const periodEnd = sub.current_period_end;

  // Insert subscription record
  await db()
    .from('subscriptions')
    .upsert({
      profile_id: profileId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: mapSubscriptionStatus(subscription.status),
      price_amount: priceAmount,
      currency,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    }, {
      onConflict: 'stripe_subscription_id'
    });

  console.log('Subscription created:', subscription.id);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const status = mapSubscriptionStatus(subscription.status);
  const sub = subscription as any;
  const periodStart = sub.current_period_start || sub.billing_cycle_anchor;
  const periodEnd = sub.current_period_end;

  // Update subscription record
  const { error } = await db()
    .from('subscriptions')
    .update({
      status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancelled_at: sub.canceled_at 
        ? new Date(sub.canceled_at * 1000).toISOString() 
        : null
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Failed to update subscription:', error);
  }

  // Handle status-specific actions
  if (status === 'past_due') {
    await notifyPaymentIssue(subscription.id);
  }

  console.log('Subscription updated:', subscription.id, status);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Update status to cancelled
  await db()
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  // Get subscriber profile to remove from Telegram
  const { data: sub } = await db()
    .from('subscriptions')
    .select('profile_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (sub) {
    const { data: subscriber } = await db()
      .from('subscriber_profiles')
      .select('telegram_user_id')
      .eq('profile_id', sub.profile_id)
      .single();

    if (subscriber?.telegram_user_id) {
      // Remove from VIP channel
      await removeUserFromVipChannel(subscriber.telegram_user_id);

      // Notify user
      await sendMessage(subscriber.telegram_user_id,
        `😔 <b>Subscription Ended</b>\n\n` +
        `Your TipstersKing Premium subscription has been cancelled.\n\n` +
        `You've been removed from the VIP channel.\n\n` +
        `Want to come back? Resubscribe at:\n` +
        `https://tipstersking.com/pricing`
      );
    }
  }

  console.log('Subscription deleted:', subscription.id);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const inv = invoice as any;
  const subscriptionId = inv.subscription as string;
  if (!subscriptionId) return;

  // Update subscription status
  await db()
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', subscriptionId);

  await notifyPaymentIssue(subscriptionId);

  console.log('Payment failed for subscription:', subscriptionId);
}

// ============================================================
// Helpers
// ============================================================

function mapSubscriptionStatus(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    'active': 'active',
    'trialing': 'trialing',
    'past_due': 'past_due',
    'canceled': 'cancelled',
    'unpaid': 'past_due',
    'incomplete': 'past_due',
    'incomplete_expired': 'cancelled',
    'paused': 'cancelled',
  };
  return statusMap[stripeStatus] || 'active';
}

async function notifyPaymentIssue(subscriptionId: string) {
  const { data: sub } = await db()
    .from('subscriptions')
    .select('profile_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!sub) return;

  const { data: subscriber } = await db()
    .from('subscriber_profiles')
    .select('telegram_user_id')
    .eq('profile_id', sub.profile_id)
    .single();

  if (subscriber?.telegram_user_id) {
    await sendMessage(subscriber.telegram_user_id,
      `⚠️ <b>Payment Issue</b>\n\n` +
      `We couldn't process your subscription payment.\n\n` +
      `Please update your payment method to keep your Premium access:\n` +
      `https://tipstersking.com/dashboard/billing\n\n` +
      `If not resolved within 3 days, your access will be paused.`
    );
  }
}
