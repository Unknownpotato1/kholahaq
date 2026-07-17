import { NextRequest, NextResponse } from "next/server";
import { Chats, Messages } from "@/lib/repository";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/chat/messages?sessionId=...
 * Returns all messages for the visitor's chat thread.
 * The visitor authenticates by sessionId (their localStorage value) —
 * they can only read their own thread.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `chat_read:${ip}`, limit: 60, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId") || "";
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const chat = await Chats.getBySession(sessionId);
  if (!chat) {
    return NextResponse.json({ messages: [] });
  }
  const messages = await Messages.listByChat(chat.id);
  return NextResponse.json({ messages, chatId: chat.id });
}
