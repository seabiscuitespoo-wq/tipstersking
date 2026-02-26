import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(request: NextRequest) {
  try {
    const { chatId, userId } = await request.json();

    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json(
        { error: "Telegram bot not configured" },
        { status: 500 }
      );
    }

    // Create invite link
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createChatInviteLink`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          member_limit: 1, // Single-use link
          expire_date: Math.floor(Date.now() / 1000) + 86400, // 24h expiry
        }),
      }
    );

    const data = await response.json();

    if (!data.ok) {
      console.error("Telegram API error:", data);
      return NextResponse.json(
        { error: "Failed to create invite link" },
        { status: 500 }
      );
    }

    return NextResponse.json({ inviteLink: data.result.invite_link });
  } catch (error) {
    console.error("Telegram invite error:", error);
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    );
  }
}

// Kick user from channel
export async function DELETE(request: NextRequest) {
  try {
    const { chatId, userId } = await request.json();

    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json(
        { error: "Telegram bot not configured" },
        { status: 500 }
      );
    }

    // Ban user (kick)
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/banChatMember`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          user_id: userId,
          revoke_messages: false,
        }),
      }
    );

    const data = await response.json();

    if (!data.ok) {
      console.error("Telegram API error:", data);
      return NextResponse.json(
        { error: "Failed to remove user" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Telegram kick error:", error);
    return NextResponse.json(
      { error: "Failed to remove user" },
      { status: 500 }
    );
  }
}
