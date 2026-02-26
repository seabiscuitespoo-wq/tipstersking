import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

async function sendTelegramMessage(chatId: string | number, text: string, options?: object) {
  if (!TELEGRAM_BOT_TOKEN) return;
  
  await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        ...options,
      }),
    }
  );
}

async function createChannelInviteLink() {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) return null;
  
  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createChatInviteLink`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHANNEL_ID,
        member_limit: 1, // Single-use
        expire_date: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days
      }),
    }
  );
  
  const data = await response.json();
  return data.ok ? data.result.invite_link : null;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const telegramUserId = session.metadata?.telegram_user_id;
      const customerEmail = session.customer_email;
      
      console.log("New subscription!");
      console.log("- Telegram User ID:", telegramUserId);
      console.log("- Email:", customerEmail);
      
      if (telegramUserId) {
        // Create invite link for premium channel
        const inviteLink = await createChannelInviteLink();
        
        // Send welcome message with invite link
        await sendTelegramMessage(
          telegramUserId,
          `🎉 <b>Kiitos tilauksestasi!</b>\n\n` +
          `Olet nyt TipstersKing Premium -jäsen!\n\n` +
          (inviteLink 
            ? `👇 <b>Liity premium-kanavalle:</b>\n${inviteLink}\n\n` 
            : ``) +
          `<i>Linkki on henkilökohtainen ja vanhenee 7 päivän kuluttua.</i>\n\n` +
          `Kysymyksiä? Ota yhteyttä: @TipstersKingSupport`,
          {
            reply_markup: inviteLink ? {
              inline_keyboard: [
                [{ text: "📱 Liity kanavalle", url: inviteLink }],
              ],
            } : undefined,
          }
        );
        
        // TODO: Save subscription to database
        // - telegram_user_id
        // - stripe_customer_id: session.customer
        // - stripe_subscription_id: session.subscription
        // - email: customerEmail
        // - status: 'active'
      }
      
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log("Subscription cancelled:", subscription.id);
      
      // TODO: 
      // 1. Get telegram_user_id from database using subscription.id
      // 2. Remove from Telegram channel
      // 3. Update database status to 'cancelled'
      // 4. Send notification to user
      
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log("Subscription updated:", subscription.id, subscription.status);
      
      // Handle status changes (past_due, unpaid, etc.)
      if (subscription.status === "past_due") {
        // TODO: Warn user about payment issue
      }
      
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      console.log("Payment failed:", invoice.id);
      
      // TODO:
      // 1. Get telegram_user_id from database
      // 2. Send warning message about failed payment
      
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
