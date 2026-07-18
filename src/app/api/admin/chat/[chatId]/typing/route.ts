import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";
import { Chats } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/chat/[chatId]/typing
 * Body: { isTyping }
 *
 * Admin toggles their typing indicator for a specific chat.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  await requireAdmin();
  const { chatId } = await params;

  const body = (await req.json().catch(() => ({}))) as { isTyping?: boolean };

  const chat = await Chats.getById(chatId);
  if (!chat) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await Chats.setTyping(chatId, "admin", !!body.isTyping);
  return NextResponse.json({ ok: true });
}
