import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";
import { Chats, Messages, Accounts, Logs } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/chat/[chatId]/send-password
 * Body: { accountId: string }
 *
 * Admin approves a manual payment by sending the decrypted current password
 * as a chat message. The message is marked `passwordReveal: true` so the UI
 * can render it with special styling + copy button.
 *
 * SECURITY:
 *  - Requires admin session.
 *  - Password is decrypted server-side (same AES-256-GCM path as before).
 *  - Only this chat's session owner can read the message (chats are
 *    session-scoped via the visitor's localStorage sessionId).
 *  - The action is logged.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const session = await requireAdmin();
  const { chatId } = await params;

  const chat = await Chats.getById(chatId);
  if (!chat) {
    return NextResponse.json({ error: "chat_not_found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as { accountId?: string };
  if (!body.accountId) {
    return NextResponse.json({ error: "accountId required" }, { status: 400 });
  }

  const account = await Accounts.getById(body.accountId);
  if (!account) {
    return NextResponse.json({ error: "account_not_found" }, { status: 404 });
  }

  // Decrypt the current password — same path as the old unlock flow.
  const password = await Accounts.revealCurrentPassword(account.id);
  if (!password) {
    return NextResponse.json(
      { error: "password_unavailable" },
      { status: 500 }
    );
  }

  // Send as a password-reveal message in this chat.
  const message = await Messages.create({
    chatId,
    sender: "admin",
    text: password,
    passwordReveal: true,
  });

  await Logs.create({
    action: "password_sent_via_chat",
    targetId: account.id,
    detail: `to chat ${chatId} (${account.username})`,
    adminUid: session.adminUid,
  });

  return NextResponse.json({ ok: true, message, username: account.username });
}
