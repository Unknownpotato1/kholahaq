import { NextRequest, NextResponse } from "next/server";
import { Chats, Messages } from "@/lib/repository";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The exact message that triggers an automated reply.
const TRIGGER_MESSAGE = "I've paid, now give me access";
const AUTO_REPLY =
  "Please send your email or mobile number that you used on payment page to verify your payment";
const AUTO_REPLY_DELAY_MS = 3000;

/**
 * Visitor sends a message (text and/or image).
 * Image is sent as a base64 data URL — in sandbox mode this is stored as-is
 * in SQLite. In production, the same payload is accepted but you'd typically
 * move it to Firebase Storage and store the URL. For simplicity and to keep
 * the visitor anonymous (no upload auth), we accept data URLs up to ~900 KB.
 *
 * AUTO-REPLY: When the user's text is EXACTLY "I've paid, now give me access",
 * the server also creates an admin reply dated 3 seconds in the future. The
 * client filters out future-dated messages and shows a typing bubble until
 * the message becomes visible. For any other message, no auto-reply fires
 * and the admin replies manually.
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

  // Auto-reply scheduling — only for the exact trigger message.
  let pendingAutoReply: Date | null = null;
  if (text === TRIGGER_MESSAGE) {
    pendingAutoReply = new Date(Date.now() + AUTO_REPLY_DELAY_MS);
    await Messages.create({
      chatId: chat.id,
      sender: "admin",
      text: AUTO_REPLY,
      passwordReveal: false,
    }).then((msg) => {
      // Re-write the createdAt to 3s in the future so the client can show
      // a typing bubble until then. We do this via a direct repository
      // update if available; otherwise the message just appears immediately.
      // For Firestore we update the doc; for Prisma we update the row.
      // Both paths are handled in Messages.scheduleForFuture below.
      return Messages.scheduleForFuture(msg.id, pendingAutoReply!);
    });
  }

  return NextResponse.json({
    ok: true,
    message,
    autoReplyScheduled: !!pendingAutoReply,
    autoReplyAt: pendingAutoReply?.toISOString() || null,
  });
}
