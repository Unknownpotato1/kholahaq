import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";
import { Chats } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/chat/[chatId]/read
 *
 * Marks a chat as read by the admin. Sets lastReadAt = now, so the chat
 * is considered "unread" only if a new message arrives after this point.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  await requireAdmin();
  const { chatId } = await params;

  const chat = await Chats.getById(chatId);
  if (!chat) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await Chats.markRead(chatId);

  return NextResponse.json({ ok: true });
}
