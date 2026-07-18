import { NextRequest, NextResponse } from "next/server";
import { Chats, Messages } from "@/lib/repository";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/chat/typing
 * Body: { sessionId, isTyping }
 *
 * Visitor toggles their typing indicator. Fire-and-forget — the client
 * debounces this to ~1 call per 1.5s while typing.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `chat_typing:${ip}`, limit: 60, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    sessionId?: string;
    isTyping?: boolean;
  };
  const sessionId = (body.sessionId || "").trim();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const chat = await Chats.getBySession(sessionId);
  if (!chat) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  await Chats.setTyping(chat.id, "user", !!body.isTyping);
  return NextResponse.json({ ok: true });
}
