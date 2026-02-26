import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const PRICES = {
  earlyBird: {
    id: "price_1T4yWUAaocVx6MDw1FtJoiT9",
    name: "🚀 Early Bird",
    price: "19,90€/kk",
  },
  pro: {
    id: "price_1T4yWcAaocVx6MDwOosccZG3",
    name: "👑 Pro",
    price: "29,90€/kk",
  },
  yearly: {
    id: "price_1T4yWdAaocVx6MDwRMeh8l4i",
    name: "📅 Vuositilaus",
    price: "249€/vuosi",
  },
};

async function sendMessage(chatId: number, text: string, options?: object) {
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

async function answerCallback(callbackQueryId: string) {
  await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId }),
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
  await sendMessage(
    chatId,
    `💎 <b>Valitse tilauksesi:</b>\n\n` +
    `🚀 <b>Early Bird</b> - 19,90€/kk\n` +
    `<i>Rajoitettu: vain 100 paikkaa!</i>\n\n` +
    `👑 <b>Pro</b> - 29,90€/kk\n` +
    `<i>Täysi pääsy kaikkeen</i>\n\n` +
    `📅 <b>Vuositilaus</b> - 249€/vuosi\n` +
    `<i>Säästä 20% (2kk ilmaiseksi)</i>`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🚀 Early Bird - 19,90€/kk", callback_data: "subscribe_earlyBird" }],
          [{ text: "👑 Pro - 29,90€/kk", callback_data: "subscribe_pro" }],
          [{ text: "📅 Vuosi - 249€ (säästä 20%)", callback_data: "subscribe_yearly" }],
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

      // Answer callback immediately to remove loading state
      await answerCallback(callbackQuery.id);

      // Show plans
      if (data === "show_plans") {
        await showPlans(chatId);
      }
      // Subscribe to a plan
      else if (data.startsWith("subscribe_")) {
        const plan = data.replace("subscribe_", "");
        const priceConfig = PRICES[plan as keyof typeof PRICES];
        
        if (priceConfig) {
          const session = await createCheckoutSession(userId, priceConfig.id);
          
          await sendMessage(
            chatId,
            `💳 <b>Tilaa ${priceConfig.name}</b>\n\n` +
            `Hinta: ${priceConfig.price}\n\n` +
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

      // /start command
      if (text.startsWith("/start")) {
        await sendMessage(
          chatId,
          `👑 <b>Tervetuloa TipstersKingiin, ${firstName}!</b>\n\n` +
          `Olemme Suomen johtava vedonlyöntitipsien palvelu.\n\n` +
          `📊 <b>Tilastomme:</b>\n` +
          `• ROI: +12.4%\n` +
          `• Win rate: 58%\n` +
          `• Yli 500 tyytyväistä tilaajaa\n\n` +
          `Valitse /subscribe aloittaaksesi tilauksen!`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "🚀 Tilaa nyt", callback_data: "show_plans" }],
                [{ text: "📊 Katso tilastot", url: "https://www.tipstersking.com/leaderboard" }],
              ],
            },
          }
        );
      }

      // /subscribe command
      else if (text === "/subscribe") {
        await showPlans(chatId);
      }

      // /help command
      else if (text === "/help") {
        await sendMessage(
          chatId,
          `ℹ️ <b>TipstersKing Bot - Ohjeet</b>\n\n` +
          `/start - Aloita ja näe esittely\n` +
          `/subscribe - Tilaa premium\n` +
          `/status - Tarkista tilauksesi\n` +
          `/help - Näytä tämä ohje\n\n` +
          `Kysymyksiä? Ota yhteyttä: @TipstersKingSupport`
        );
      }

      // /status command
      else if (text === "/status") {
        await sendMessage(
          chatId,
          `📋 <b>Tilauksesi tila</b>\n\n` +
          `Telegram ID: <code>${userId}</code>\n\n` +
          `<i>Tilauksen tarkistus tulossa pian...</i>`
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}
