import { NextRequest, NextResponse } from "next/server";
import { Chats, Messages } from "@/lib/repository";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Visitor sends a message (text and/or image).
 * Image is sent as a base64 data URL — in sandbox mode this is stored as-is
 * in SQLite. In production, the same payload is accepted but you'd typically
 * move it to Firebase Storage and store the URL. For simplicity and to keep
 * the visitor anonymous (no upload auth), we accept data URLs up to ~2 MB.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `chat_send:${ip}`, limit: 20, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    sessionId?: string;
    text?: string;
    imageUrl?: string;
  };
  const sessionId = (body.sessionId || "").trim();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const text = (body.text || "").trim();
  const imageUrl = (body.imageUrl || "").trim();
  if (!text && !imageUrl) {
    return NextResponse.json({ error: "empty_message" }, { status: 400 });
  }
  if (text.length > 4000) {
    return NextResponse.json({ error: "text_too_long" }, { status: 400 });
  }
  // Firestore documents have a 1 MB max size, so the data URL must be
  // comfortably under that (accounting for the rest of the doc).
  if (imageUrl.length > 900_000) {
    return NextResponse.json({ error: "image_too_large" }, { status: 413 });
  }

  const chat = await Chats.getOrCreateBySession(sessionId);
  const message = await Messages.create({
    chatId: chat.id,
    sender: "user",
    text: text || null,
    imageUrl: imageUrl || null,
  });
  return NextResponse.json({ ok: true, message });
}
