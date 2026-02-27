import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID; // Your Telegram ID for support notifications

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

// Updated prices with new tiered system
const PRICES = {
  founding: {
    id: "price_1T5O9cAaocVx6MDwOODjnjGO",
    name: "🏆 Founding Member",
    price: "7,90€/kk",
    description: "Ikuisesti! (1-50)",
  },
  earlyBird: {
    id: "price_1T5O9jAaocVx6MDwDuyNYIoO",
    name: "⭐ Early Bird",
    price: "14,90€/kk",
    description: "Ikuisesti! (51-100)",
  },
  premium: {
    id: "price_1T4yWcAaocVx6MDwOosccZG3",
    name: "👑 Premium",
    price: "29,90€/kk",
    description: "Normaalihinta",
  },
};

// FAQ content
const FAQ = {
  tilaus: {
    title: "📦 Tilaus & maksu",
    content: `<b>Miten tilaan?</b>
Käytä /subscribe komentoa ja valitse paketti.

<b>Mitä maksutapoja on?</b>
Kortit (Visa, Mastercard) Stripen kautta.

<b>Voinko perua?</b>
Kyllä, milloin vain. Käyttöoikeus säilyy jakson loppuun.`,
  },
  tipit: {
    title: "💡 Tipit & palvelu",
    content: `<b>Miten saan tipit?</b>
Premium-kanavalle tulee tipit reaaliajassa.

<b>Kuinka monta tippiä päivässä?</b>
1-5 tippiä riippuen tarjonnasta. Laatu > määrä.

<b>Millaisiin lajeihin?</b>
Pääasiassa jalkapallo, jääkiekko, koris.`,
  },
  tekninen: {
    title: "🔧 Tekniset ongelmat",
    content: `<b>En saanut kutsulinkkiä</b>
Tarkista roskaposti. Jos ei löydy, käytä /support.

<b>Linkki ei toimi</b>
Käytä /support ja kerro ongelma, autamme!

<b>Tilaus ei näy</b>
Odota 5min maksun jälkeen. Jos ei toimi → /support`,
  },
};

// Store for support conversations (in production, use database)
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
  const subscriberCount = 0; // Replace with actual count from DB
  
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
    `Nykyinen tarjous:\n` +
    `${plan.name} - <b>${plan.price}</b>\n` +
    `<i>${plan.description}</i>\n\n` +
    (spotsLeft > 0 ? `⚡ <b>Enää ${spotsLeft} paikkaa jäljellä!</b>\n\n` : "") +
    `✅ Kaikki premium-tipit\n` +
    `✅ Telegram-kanava\n` +
    `✅ Reaaliaikaiset ilmoitukset\n` +
    `✅ ROI-tilastot`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: `${plan.name} - ${plan.price}`, callback_data: `subscribe_${currentTier}` }],
          [{ text: "❓ Usein kysytyt", callback_data: "faq_menu" }],
        ],
      },
    }
  );
}

async function showFaqMenu(chatId: number) {
  await sendMessage(
    chatId,
    `❓ <b>Usein kysytyt kysymykset</b>\n\nValitse aihe:`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📦 Tilaus & maksu", callback_data: "faq_tilaus" }],
          [{ text: "💡 Tipit & palvelu", callback_data: "faq_tipit" }],
          [{ text: "🔧 Tekniset ongelmat", callback_data: "faq_tekninen" }],
          [{ text: "💬 Ota yhteyttä tukeen", callback_data: "start_support" }],
          [{ text: "« Takaisin", callback_data: "show_plans" }],
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
    `🆘 <b>Uusi tukipyyntö!</b>\n\n` +
    `👤 <b>${userName}</b> (${userLink})\n` +
    `🆔 <code>${userId}</code>\n\n` +
    `💬 <i>${message}</i>\n\n` +
    `Vastaa: <code>/reply ${userId} [viesti]</code>`,
  );
}

async function replyToUser(userId: number, message: string, adminName: string) {
  await sendMessage(
    userId,
    `💬 <b>Vastaus tuelta:</b>\n\n${message}\n\n<i>— ${adminName}, TipstersKing</i>`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Kiitos, ongelma ratkesi!", callback_data: "support_resolved" }],
          [{ text: "💬 Jatka keskustelua", callback_data: "start_support" }],
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
      const firstName = callbackQuery.from.first_name || "Asiakas";

      await answerCallback(callbackQuery.id);

      // Show plans
      if (data === "show_plans") {
        await showPlans(chatId);
      }
      // FAQ menu
      else if (data === "faq_menu") {
        await showFaqMenu(chatId);
      }
      // FAQ answers
      else if (data.startsWith("faq_")) {
        const topic = data.replace("faq_", "") as keyof typeof FAQ;
        if (FAQ[topic]) {
          await sendMessage(
            chatId,
            `${FAQ[topic].title}\n\n${FAQ[topic].content}`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "« Takaisin FAQ:iin", callback_data: "faq_menu" }],
                  [{ text: "💬 Ota yhteyttä tukeen", callback_data: "start_support" }],
                ],
              },
            }
          );
        }
      }
      // Start support
      else if (data === "start_support") {
        supportConversations.set(userId, {
          name: firstName,
          username: callbackQuery.from.username,
          lastMessage: new Date(),
        });
        
        await sendMessage(
          chatId,
          `💬 <b>Asiakaspalvelu</b>\n\n` +
          `Kirjoita viestisi alle, niin vastaamme mahdollisimman pian!\n\n` +
          `<i>Voit kertoa esim:\n` +
          `• Mitä ongelmaa kohtasit?\n` +
          `• Telegram-käyttäjänimesi\n` +
          `• Maksun ajankohta (jos liittyy tilaukseen)</i>`,
        );
      }
      // Support resolved
      else if (data === "support_resolved") {
        supportConversations.delete(userId);
        await sendMessage(
          chatId,
          `✅ <b>Mahtavaa!</b>\n\nKiitos yhteydenotosta. Mukavia vedonlyöntihetkiä! 🎯`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "🏠 Alkuun", callback_data: "show_plans" }],
              ],
            },
          }
        );
      }
      // Subscribe to a plan
      else if (data.startsWith("subscribe_")) {
        const plan = data.replace("subscribe_", "") as keyof typeof PRICES;
        const priceConfig = PRICES[plan];
        
        if (priceConfig) {
          const session = await createCheckoutSession(userId, priceConfig.id);
          
          await sendMessage(
            chatId,
            `💳 <b>Tilaa ${priceConfig.name}</b>\n\n` +
            `Hinta: ${priceConfig.price}\n` +
            `${priceConfig.description}\n\n` +
            `Klikkaa alla olevaa linkkiä siirtyäksesi maksuun:\n\n` +
            `👉 <a href="${session.url}">Siirry maksamaan</a>\n\n` +
            `<i>Maksu käsitellään turvallisesti Stripen kautta.</i>`,
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
      const firstName = message.from.first_name || "Hei";
      const username = message.from.username;

      // Admin reply command
      if (text.startsWith("/reply ") && ADMIN_CHAT_ID && chatId.toString() === ADMIN_CHAT_ID) {
        const parts = text.replace("/reply ", "").split(" ");
        const targetUserId = parseInt(parts[0]);
        const replyMessage = parts.slice(1).join(" ");
        
        if (targetUserId && replyMessage) {
          await replyToUser(targetUserId, replyMessage, firstName);
          await sendMessage(chatId, `✅ Vastaus lähetetty käyttäjälle ${targetUserId}`);
        }
        return NextResponse.json({ ok: true });
      }

      // /start command
      if (text.startsWith("/start")) {
        await sendMessage(
          chatId,
          `👑 <b>Tervetuloa TipstersKingiin, ${firstName}!</b>\n\n` +
          `Saat parhaat vedonlyöntitipsit suoraan puhelimeesi.\n\n` +
          `🏆 <b>Founding Member -tarjous:</b>\n` +
          `Ensimmäiset 50 tilaajaa saavat hinnan <b>7,90€/kk IKUISESTI!</b>\n\n` +
          `Mitä haluat tehdä?`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "🚀 Tilaa nyt", callback_data: "show_plans" }],
                [{ text: "❓ Usein kysytyt", callback_data: "faq_menu" }],
                [{ text: "💬 Ota yhteyttä", callback_data: "start_support" }],
              ],
            },
          }
        );
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
          // Direct support message
          await notifyAdmin(userId, firstName, username, supportMessage);
          await sendMessage(
            chatId,
            `✅ <b>Viestisi on vastaanotettu!</b>\n\n` +
            `Vastaamme mahdollisimman pian.\n\n` +
            `<i>Keskimääräinen vastausaika: alle 2 tuntia</i>`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "🏠 Alkuun", callback_data: "show_plans" }],
                ],
              },
            }
          );
        } else {
          // Start support mode
          supportConversations.set(userId, {
            name: firstName,
            username,
            lastMessage: new Date(),
          });
          await sendMessage(
            chatId,
            `💬 <b>Asiakaspalvelu</b>\n\n` +
            `Kirjoita viestisi, niin vastaamme mahdollisimman pian!`,
          );
        }
      }

      // /help command
      else if (text === "/help") {
        await sendMessage(
          chatId,
          `ℹ️ <b>TipstersKing Bot - Komennot</b>\n\n` +
          `/start - Aloita\n` +
          `/subscribe - Tilaa premium\n` +
          `/faq - Usein kysytyt kysymykset\n` +
          `/support - Ota yhteyttä tukeen\n` +
          `/status - Tarkista tilauksesi\n` +
          `/help - Näytä tämä ohje`,
        );
      }

      // /status command
      else if (text === "/status") {
        // TODO: Check actual subscription status from Stripe
        await sendMessage(
          chatId,
          `📋 <b>Tilauksesi tila</b>\n\n` +
          `Telegram ID: <code>${userId}</code>\n\n` +
          `<i>Haetaan tilaustietoja...</i>\n\n` +
          `Jos olet juuri tilannut etkä ole saanut pääsyä, käytä /support.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "💬 Ota yhteyttä tukeen", callback_data: "start_support" }],
              ],
            },
          }
        );
      }

      // Handle support conversation (freeform messages)
      else if (supportConversations.has(userId)) {
        const conv = supportConversations.get(userId)!;
        await notifyAdmin(userId, conv.name, conv.username, text);
        
        await sendMessage(
          chatId,
          `✅ <b>Viesti vastaanotettu!</b>\n\n` +
          `Vastaamme pian.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "📝 Lähetä lisätietoja", callback_data: "start_support" }],
                [{ text: "🏠 Alkuun", callback_data: "show_plans" }],
              ],
            },
          }
        );
      }

      // Unknown command - suggest help
      else if (text.startsWith("/")) {
        await sendMessage(
          chatId,
          `🤔 En tunnistanut komentoa.\n\nKokeile /help nähdäksesi kaikki komennot!`,
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}
