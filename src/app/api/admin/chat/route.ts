import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";
import { Chats } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/chat — list all anonymous chat threads, newest first. */
export async function GET() {
  await requireAdmin();
  const chats = await Chats.list(200);
  return NextResponse.json({ chats });
}
