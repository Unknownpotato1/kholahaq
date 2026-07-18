import { NextResponse } from "next/server";
import { notifyTelegram } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const hasToken = !!process.env.TELEGRAM_BOT_TOKEN;
  const hasChatId = !!process.env.TELEGRAM_CHAT_ID;
  const tokenLen = (process.env.TELEGRAM_BOT_TOKEN || "").length;
  const chatIdLen = (process.env.TELEGRAM_CHAT_ID || "").length;

  // Try sending a test notification
  let sendResult = "not_attempted";
  try {
    await notifyTelegram({
      sessionId: "debug_endpoint_test",
      text: "🔧 Debug test from /api/debug-telegram — if you see this, notifications work!",
    });
    sendResult = "sent (no error thrown)";
  } catch (e) {
    sendResult = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json({
    env: {
      TELEGRAM_BOT_TOKEN: hasToken,
      TELEGRAM_CHAT_ID: hasChatId,
      tokenLen,
      chatIdLen,
    },
    sendResult,
  });
}
