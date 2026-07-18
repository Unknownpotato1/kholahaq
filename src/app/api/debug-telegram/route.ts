import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    return NextResponse.json({
      error: "missing env vars",
      hasToken: !!BOT_TOKEN,
      hasChatId: !!CHAT_ID,
    });
  }

  // Call Telegram API directly and return the full response.
  const text = "🔧 Debug test — direct Telegram API call from Vercel function";
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }),
      }
    );
    const data = await res.json();
    return NextResponse.json({
      httpStatus: res.status,
      telegramResponse: data,
      chatIdUsed: CHAT_ID,
      tokenPrefix: BOT_TOKEN.slice(0, 10) + "...",
    });
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
