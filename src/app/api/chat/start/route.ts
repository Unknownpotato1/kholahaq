import { NextRequest, NextResponse } from "next/server";
import { Chats } from "@/lib/repository";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StartBody {
  sessionId?: string;
  displayName?: string;
}

/**
 * Returns the visitor's chat thread, creating one if needed.
 * The sessionId is generated client-side and stored in localStorage so the
 * same visitor keeps their conversation across reloads.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `chat_start:${ip}`, limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as StartBody;
  const sessionId = (body.sessionId || "").trim();
  if (!sessionId || sessionId.length > 100) {
    return NextResponse.json({ error: "invalid_session" }, { status: 400 });
  }

  const chat = await Chats.getOrCreateBySession(
    sessionId,
    body.displayName?.slice(0, 40) || "Anonymous"
  );
  return NextResponse.json({ chat });
}
