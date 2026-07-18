import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";
import { Chats, Messages, Logs } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/chat/[chatId] — full message history for one thread. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const session = await requireAdmin();
  const { chatId } = await params;
  const chat = await Chats.getById(chatId);
  if (!chat) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const messages = await Messages.listByChat(chatId);
  await Logs.create({
    action: "chat_opened",
    targetId: chatId,
    detail: chat.sessionId,
    adminUid: session.adminUid,
  });
  return NextResponse.json({ chat, messages });
}

/** POST /api/admin/chat/[chatId] — admin replies to a visitor. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const session = await requireAdmin();
  const { chatId } = await params;
  const chat = await Chats.getById(chatId);
  if (!chat) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    text?: string;
    imageUrl?: string;
  };
  const text = (body.text || "").trim();
  const imageUrl = (body.imageUrl || "").trim();
  if (!text && !imageUrl) {
    return NextResponse.json({ error: "empty_message" }, { status: 400 });
  }
  const message = await Messages.create({
    chatId,
    sender: "admin",
    text: text || null,
    imageUrl: imageUrl || null,
  });
  // Clear the admin's typing indicator once they send.
  await Chats.setTyping(chatId, "admin", false);
  await Logs.create({
    action: "chat_reply",
    targetId: chatId,
    detail: text.slice(0, 80) || "[image]",
    adminUid: session.adminUid,
  });
  return NextResponse.json({ ok: true, message });
}

/** DELETE /api/admin/chat/[chatId] — permanently delete a chat + messages. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const session = await requireAdmin();
  const { chatId } = await params;

  const chat = await Chats.getById(chatId);
  if (!chat) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await Chats.delete(chatId);

  await Logs.create({
    action: "chat_deleted",
    targetId: chatId,
    detail: `deleted chat for ${chat.displayName} (${chat.sessionId.slice(0, 16)})`,
    adminUid: session.adminUid,
  });

  return NextResponse.json({ ok: true });
}
