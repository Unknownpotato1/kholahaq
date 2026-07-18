import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";
import { Chats, Messages, Logs } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/chat/[chatId]/reject
 *
 * Admin rejects a manual payment. Sends a templated rejection message in
 * the chat so the visitor knows their payment couldn't be verified.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const session = await requireAdmin();
  const { chatId } = await params;

  const chat = await Chats.getById(chatId);
  if (!chat) {
    return NextResponse.json({ error: "chat_not_found" }, { status: 404 });
  }

  const message = await Messages.create({
    chatId,
    sender: "admin",
    text: "Sorry, I couldn't verify your payment. Please send a clear screenshot of the successful payment confirmation and try again. If you believe this is an error, let me know.",
  });

  await Logs.create({
    action: "payment_rejected",
    targetId: chatId,
    detail: `rejected for chat ${chatId}`,
    adminUid: session.adminUid,
  });

  return NextResponse.json({ ok: true, message });
}
