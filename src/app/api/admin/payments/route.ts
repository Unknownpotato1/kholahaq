import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";
import { Payments } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdmin();
  const items = await Payments.list(200);
  return NextResponse.json({ items });
}
