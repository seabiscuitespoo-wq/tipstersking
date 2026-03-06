import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const VIP_CHANNEL_ID = process.env.TELEGRAM_VIP_CHANNEL_ID;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

// Tiered pricing - LIVE PRICES
const PRICES = {
  founding: {
    id: "price_1T5PSNAaocVx6MDwLrCZpnME",
    name: "🏆 Founding Member",
    price: "€7.90/mo",
    description: "Forever! (spots 1-50)",
  },
  earlyBird: {
    id: "price_1T5PSOAaocVx6MDw1xtQq8MW",
    name: "⭐ Early Bird",
    price: "€14.90/mo",
    description: "Forever! (spots 51-100)",
  },
  premium: {
    id: "price_1T5PSOAaocVx6MDwjEFxMVTj",
    name: "👑 Premium",
    price: "€29.90/mo",
    description: "Regular price",
  },
};

// FAQ content
const FAQ = {
  subscription: {
    title: "📦 Subscription & Payment",
    content: `<b>How do I subscribe?</b>
Use the /subscribe command and choose a plan.

<b>What payment methods are accepted?</b>
Cards (Visa, Mastercard) via Stripe.

<b>Can I cancel anytime?</b>
Yes! You keep access until the end of your billing period.`,
  },
  tips: {
    title: "💡 Tips & Service",
    content: `<b>How do I receive tips?</b>
Tips are posted in real-time to the Premium channel.

<b>How many tips per day?</b>
1-5 tips depending on value. Quality > quantity.

<b>What sports do you cover?</b>
Mainly football, hockey, and basketball.`,
  },
  technical: {
    title: "🔧 Technical Issues",
    content: `<b>I didn't receive the invite link</b>
Check your spam folder. If not found, use /support.

<b>The link doesn't work</b>
Use /support and describe the issue, we'll help!

<b>My subscription isn't showing</b>
Wait 5 min after payment. If still not working → /support`,
  },
};

// Store for support conversations
const supportConversations = new Map<number, { 
  name: string; 
  username?: string;
  lastMessage: Date;
}>();

async function sendMessage(chatId: number | string, text: string, options?: object) {
  const response = await fetch(
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
  return response.json();
}

async function answerCallback(callbackQueryId: string, text?: string) {
  await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        callback_query_id: callbackQueryId,
        text,
      }),
    }
  );
}

async function createCheckoutSession(telegramUserId: number, priceId: string) {
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing`,
    metadata: {
      telegram_user_id: telegramUserId.toString(),
    },
  });
  return session;
}

async function showPlans(chatId: number) {
  // TODO: Get actual subscriber count to determine current tier
  const subscriberCount = 0;
  
  let currentTier: "founding" | "earlyBird" | "premium" = "founding";
  let spotsLeft = 50;
  
  if (subscriberCount >= 50 && subscriberCount < 100) {
    currentTier = "earlyBird";
    spotsLeft = 100 - subscriberCount;
  } else if (subscriberCount >= 100) {
    currentTier = "premium";
    spotsLeft = 0;
  } else {
    spotsLeft = 50 - subscriberCount;
  }

  const plan = PRICES[currentTier];
  
  await sendMessage(
    chatId,
    `💎 <b>TipstersKing Premium</b>\n\n` +
    `Current offer:\n` +
    `${plan.name} - <b>${plan.price}</b>\n` +
    `<i>${plan.description}</i>\n\n` +
    (spotsLeft > 0 ? `⚡ <b>Only ${spotsLeft} spots left!</b>\n\n` : "") +
    `✅ All premium tips\n` +
    `✅ Telegram channel access\n` +
    `✅ Real-time notifications\n` +
    `✅ ROI statistics`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: `${plan.name} - ${plan.price}`, callback_data: `subscribe_${currentTier}` }],
          [{ text: "❓ FAQ", callback_data: "faq_menu" }],
        ],
      },
    }
  );
}

async function showFaqMenu(chatId: number) {
  await sendMessage(
    chatId,
    `❓ <b>Frequently Asked Questions</b>\n\nChoose a topic:`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📦 Subscription & Payment", callback_data: "faq_subscription" }],
          [{ text: "💡 Tips & Service", callback_data: "faq_tips" }],
          [{ text: "🔧 Technical Issues", callback_data: "faq_technical" }],
          [{ text: "💬 Contact Support", callback_data: "start_support" }],
          [{ text: "« Back", callback_data: "show_plans" }],
        ],
      },
    }
  );
}

async function notifyAdmin(userId: number, userName: string, username: string | undefined, message: string) {
  if (!ADMIN_CHAT_ID) return;
  
  const userLink = username ? `@${username}` : `ID: ${userId}`;
  
  await sendMessage(
    ADMIN_CHAT_ID,
    `🆘 <b>New support request!</b>\n\n` +
    `👤 <b>${userName}</b> (${userLink})\n` +
    `🆔 <code>${userId}</code>\n\n` +
    `💬 <i>${message}</i>\n\n` +
    `Reply: <code>/reply ${userId} [message]</code>`,
  );
}

async function replyToUser(userId: number, message: string, adminName: string) {
  await sendMessage(
    userId,
    `💬 <b>Reply from support:</b>\n\n${message}\n\n<i>— ${adminName}, TipstersKing</i>`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Thanks, issue resolved!", callback_data: "support_resolved" }],
          [{ text: "💬 Continue conversation", callback_data: "start_support" }],
        ],
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const update = await request.json();
    
    // Handle callback queries (button presses)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const chatId = callbackQuery.message.chat.id;
      const userId = callbackQuery.from.id;
      const data = callbackQuery.data;
      const firstName = callbackQuery.from.first_name || "Customer";

      await answerCallback(callbackQuery.id);

      if (data === "show_plans") {
        await showPlans(chatId);
      }
      else if (data === "faq_menu") {
        await showFaqMenu(chatId);
      }
      else if (data.startsWith("faq_")) {
        const topic = data.replace("faq_", "") as keyof typeof FAQ;
        if (FAQ[topic]) {
          await sendMessage(
            chatId,
            `${FAQ[topic].title}\n\n${FAQ[topic].content}`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "« Back to FAQ", callback_data: "faq_menu" }],
                  [{ text: "💬 Contact Support", callback_data: "start_support" }],
                ],
              },
            }
          );
        }
      }
      else if (data === "start_support") {
        supportConversations.set(userId, {
          name: firstName,
          username: callbackQuery.from.username,
          lastMessage: new Date(),
        });
        
        await sendMessage(
          chatId,
          `💬 <b>Customer Support</b>\n\n` +
          `Type your message below and we'll get back to you ASAP!\n\n` +
          `<i>Please include:\n` +
          `• What issue are you experiencing?\n` +
          `• Your Telegram username\n` +
          `• Payment date (if subscription related)</i>`,
        );
      }
      else if (data === "support_resolved") {
        supportConversations.delete(userId);
        await sendMessage(
          chatId,
          `✅ <b>Awesome!</b>\n\nThanks for reaching out. Happy betting! 🎯`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "🏠 Home", callback_data: "show_plans" }],
              ],
            },
          }
        );
      }
      else if (data.startsWith("subscribe_")) {
        const plan = data.replace("subscribe_", "") as keyof typeof PRICES;
        const priceConfig = PRICES[plan];
        
        if (priceConfig) {
          const session = await createCheckoutSession(userId, priceConfig.id);
          
          await sendMessage(
            chatId,
            `💳 <b>Subscribe to ${priceConfig.name}</b>\n\n` +
            `Price: ${priceConfig.price}\n` +
            `${priceConfig.description}\n\n` +
            `Click the link below to proceed to payment:\n\n` +
            `👉 <a href="${session.url}">Go to checkout</a>\n\n` +
            `<i>Payment is processed securely via Stripe.</i>`,
            { disable_web_page_preview: true }
          );
        }
      }
      
      return NextResponse.json({ ok: true });
    }

    // Handle messages
    if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const text = message.text || "";
      const userId = message.from.id;
      const firstName = message.from.first_name || "there";
      const username = message.from.username;

      // Admin reply command
      if (text.startsWith("/reply ") && ADMIN_CHAT_ID && chatId.toString() === ADMIN_CHAT_ID) {
        const parts = text.replace("/reply ", "").split(" ");
        const targetUserId = parseInt(parts[0]);
        const replyMessage = parts.slice(1).join(" ");
        
        if (targetUserId && replyMessage) {
          await replyToUser(targetUserId, replyMessage, firstName);
          await sendMessage(chatId, `✅ Reply sent to user ${targetUserId}`);
        }
        return NextResponse.json({ ok: true });
      }

      // /start command - check for linking deep link
      if (text.startsWith("/start")) {
        // Check for verify deep link: /start verify_PROFILEID
        const verifyMatch = text.match(/^\/start verify_([a-f0-9-]+)$/i);
        
        if (verifyMatch) {
          const profileId = verifyMatch[1];
          const supabase = getSupabase();
          
          // Verify the user has a subscription
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('profile_id', profileId)
            .in('status', ['active', 'trialing'])
            .single();
          
          if (!subscription) {
            await sendMessage(
              chatId,
              `❌ <b>Verification Failed</b>\n\n` +
              `No active subscription found for this account.\n\n` +
              `Please subscribe first at tipstersking.com/pricing`,
            );
            return NextResponse.json({ ok: true });
          }
          
          // Link the Telegram account
          const { error: linkError } = await supabase
            .from('subscriber_profiles')
            .upsert({
              profile_id: profileId,
              telegram_user_id: userId,
              telegram_username: username || null,
              verified_at: new Date().toISOString(),
            }, { onConflict: 'profile_id' });
          
          if (linkError) {
            console.error('Telegram verify error:', linkError);
            await sendMessage(
              chatId,
              `❌ <b>Verification Failed</b>\n\n` +
              `Something went wrong. Please try again or contact support.`,
            );
            return NextResponse.json({ ok: true });
          }
          
          // Generate VIP channel invite
          let inviteLink = '';
          if (VIP_CHANNEL_ID) {
            try {
              const inviteRes = await fetch(
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createChatInviteLink`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: VIP_CHANNEL_ID,
                    member_limit: 1,
                    expire_date: Math.floor(Date.now() / 1000) + 86400,
                  }),
                }
              );
              const inviteData = await inviteRes.json();
              if (inviteData.ok) {
                inviteLink = inviteData.result.invite_link;
              }
            } catch (e) {
              console.error('Failed to create invite:', e);
            }
          }
          
          await sendMessage(
            chatId,
            `🎉 <b>Verification Complete!</b>\n\n` +
            `Welcome to TipstersKing VIP, ${firstName}! 👑\n\n` +
            `Your Telegram is now linked to your account.\n\n` +
            (inviteLink 
              ? `👇 <b>Join the VIP Channel:</b>\n${inviteLink}\n\n⚠️ This link expires in 24 hours.\n\n`
              : '') +
            `🔔 Turn on notifications so you never miss a tip!`,
          );
          
          return NextResponse.json({ ok: true });
        }
        
        // Check for legacy linking: /start link_CODE_PROFILEID
        const linkMatch = text.match(/^\/start link_([A-Z0-9]+)_(.+)$/);
        
        if (linkMatch) {
          const [, linkCode, profileId] = linkMatch;
          const supabase = getSupabase();
          
          // Verify the user has a subscription
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('profile_id', profileId)
            .in('status', ['active', 'trialing'])
            .single();
          
          if (!subscription) {
            await sendMessage(
              chatId,
              `❌ <b>Link Failed</b>\n\n` +
              `No active subscription found for this account.\n\n` +
              `Please subscribe first at tipstersking.com`,
            );
            return NextResponse.json({ ok: true });
          }
          
          // Link the Telegram account
          const { error: linkError } = await supabase
            .from('subscriber_profiles')
            .upsert({
              profile_id: profileId,
              telegram_user_id: userId,
              telegram_username: username || null,
              subscribed_at: new Date().toISOString(),
            }, { onConflict: 'profile_id' });
          
          if (linkError) {
            console.error('Telegram link error:', linkError);
            await sendMessage(
              chatId,
              `❌ <b>Link Failed</b>\n\n` +
              `Something went wrong. Please try again or contact support.`,
            );
            return NextResponse.json({ ok: true });
          }
          
          // Generate VIP channel invite
          let inviteMessage = '';
          if (VIP_CHANNEL_ID) {
            try {
              const inviteRes = await fetch(
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createChatInviteLink`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: VIP_CHANNEL_ID,
                    member_limit: 1,
                    expire_date: Math.floor(Date.now() / 1000) + 86400,
                  }),
                }
              );
              const inviteData = await inviteRes.json();
              if (inviteData.ok) {
                inviteMessage = `\n\n🔗 <b>Join VIP Channel:</b>\n${inviteData.result.invite_link}`;
              }
            } catch (e) {
              console.error('Failed to create invite:', e);
            }
          }
          
          await sendMessage(
            chatId,
            `✅ <b>Account Linked!</b>\n\n` +
            `Welcome to TipstersKing VIP, ${firstName}! 👑\n\n` +
            `Your Telegram is now connected. You'll receive real-time tips!` +
            inviteMessage,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "🏠 Home", callback_data: "show_plans" }],
                ],
              },
            }
          );
          
          return NextResponse.json({ ok: true });
        }
        
        // Regular /start command
        await sendMessage(
          chatId,
          `👑 <b>Welcome to TipstersKing, ${firstName}!</b>\n\n` +
          `Get the best betting tips delivered straight to your phone.\n\n` +
          `🏆 <b>Founding Member Offer:</b>\n` +
          `First 50 subscribers: <b>€7.90/mo</b> <s>€29.90</s>\n` +
          `Spots 51-100: <b>€14.90/mo</b> <s>€29.90</s>\n\n` +
          `⚡ <i>Price stays the same FOREVER!</i>\n\n` +
          `What would you like to do?`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "🚀 Subscribe Now", callback_data: "show_plans" }],
                [{ text: "🌐 Website", url: "https://tipstersking.com" }],
                [{ text: "❓ FAQ", callback_data: "faq_menu" }],
                [{ text: "💬 Contact Us", callback_data: "start_support" }],
              ],
            },
          }
        );
      }

      // /verify command - verify by email
      else if (text.startsWith("/verify ")) {
        const email = text.replace("/verify ", "").trim().toLowerCase();
        
        if (!email || !email.includes("@")) {
          await sendMessage(
            chatId,
            `⚠️ <b>Invalid email</b>\n\n` +
            `Usage: <code>/verify your@email.com</code>`,
          );
          return NextResponse.json({ ok: true });
        }
        
        const supabase = getSupabase();
        
        // Find profile by email
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();
        
        if (!profile) {
          await sendMessage(
            chatId,
            `❌ <b>Email not found</b>\n\n` +
            `No account found with this email.\n\n` +
            `Make sure you've completed checkout at:\n` +
            `https://tipstersking.com/pricing`,
          );
          return NextResponse.json({ ok: true });
        }
        
        // Check subscription
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('profile_id', profile.id)
          .in('status', ['active', 'trialing'])
          .single();
        
        if (!subscription) {
          await sendMessage(
            chatId,
            `❌ <b>No active subscription</b>\n\n` +
            `Your account exists but no active subscription found.\n\n` +
            `Subscribe at: https://tipstersking.com/pricing`,
          );
          return NextResponse.json({ ok: true });
        }
        
        // Link account
        await supabase
          .from('subscriber_profiles')
          .upsert({
            profile_id: profile.id,
            telegram_user_id: userId,
            telegram_username: username || null,
            verified_at: new Date().toISOString(),
          }, { onConflict: 'profile_id' });
        
        // Generate VIP invite
        let inviteLink = '';
        if (VIP_CHANNEL_ID) {
          try {
            const inviteRes = await fetch(
              `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createChatInviteLink`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: VIP_CHANNEL_ID,
                  member_limit: 1,
                  expire_date: Math.floor(Date.now() / 1000) + 86400,
                }),
              }
            );
            const inviteData = await inviteRes.json();
            if (inviteData.ok) {
              inviteLink = inviteData.result.invite_link;
            }
          } catch (e) {
            console.error('Invite error:', e);
          }
        }
        
        await sendMessage(
          chatId,
          `🎉 <b>Verified!</b>\n\n` +
          `Welcome to TipstersKing VIP, ${firstName}! 👑\n\n` +
          (inviteLink 
            ? `👇 <b>Join VIP Channel:</b>\n${inviteLink}\n\n`
            : '') +
          `🔔 Turn on notifications!`,
        );
        return NextResponse.json({ ok: true });
      }

      // /subscribe command
      else if (text === "/subscribe") {
        await showPlans(chatId);
      }

      // /faq command
      else if (text === "/faq") {
        await showFaqMenu(chatId);
      }

      // /support command
      else if (text === "/support" || text.startsWith("/support ")) {
        const supportMessage = text.replace("/support", "").trim();
        
        if (supportMessage) {
          await notifyAdmin(userId, firstName, username, supportMessage);
          await sendMessage(
            chatId,
            `✅ <b>Message received!</b>\n\n` +
            `We'll get back to you as soon as possible.\n\n` +
            `<i>Average response time: under 2 hours</i>`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "🏠 Home", callback_data: "show_plans" }],
                ],
              },
            }
          );
        } else {
          supportConversations.set(userId, {
            name: firstName,
            username,
            lastMessage: new Date(),
          });
          await sendMessage(
            chatId,
            `💬 <b>Customer Support</b>\n\n` +
            `Type your message and we'll get back to you ASAP!`,
          );
        }
      }

      // /help command
      else if (text === "/help") {
        await sendMessage(
          chatId,
          `ℹ️ <b>TipstersKing Bot - Commands</b>\n\n` +
          `/start - Get started\n` +
          `/subscribe - Subscribe to premium\n` +
          `/faq - Frequently asked questions\n` +
          `/support - Contact support\n` +
          `/status - Check your subscription\n` +
          `/help - Show this help`,
        );
      }

      // /status command
      else if (text === "/status") {
        await sendMessage(
          chatId,
          `📋 <b>Your Subscription</b>\n\n` +
          `Telegram ID: <code>${userId}</code>\n\n` +
          `<i>Fetching subscription status...</i>\n\n` +
          `If you just subscribed and don't have access, use /support.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "💬 Contact Support", callback_data: "start_support" }],
              ],
            },
          }
        );
      }

      // Handle support conversation
      else if (supportConversations.has(userId)) {
        const conv = supportConversations.get(userId)!;
        await notifyAdmin(userId, conv.name, conv.username, text);
        
        await sendMessage(
          chatId,
          `✅ <b>Message received!</b>\n\n` +
          `We'll reply soon.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "📝 Send more details", callback_data: "start_support" }],
                [{ text: "🏠 Home", callback_data: "show_plans" }],
              ],
            },
          }
        );
      }

      // Unknown command
      else if (text.startsWith("/")) {
        await sendMessage(
          chatId,
          `🤔 I don't recognize that command.\n\nTry /help to see all available commands!`,
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}
