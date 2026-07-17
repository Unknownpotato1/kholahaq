import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";
import { Logs } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdmin();
  const items = await Logs.list(200);
  return NextResponse.json({ items });
}
