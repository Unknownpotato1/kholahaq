import { NextRequest, NextResponse } from "next/server";
import { Accounts, toPublicAccount, Logs } from "@/lib/repository";
import { requireAdmin } from "@/lib/admin-session";
import { sanitizeQuery } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await requireAdmin();
  const url = new URL(req.url);
  const q = sanitizeQuery(url.searchParams.get("q") || "");
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = parseInt(url.searchParams.get("limit") || "20", 10);
  const { items, total } = await Accounts.search(q, { page, limit });
  return NextResponse.json({
    items: items.map(toPublicAccount),
    total,
    page,
    limit,
  });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  const body = await req.json();
  const { username, previousPassword, currentPassword, price, category, notes, status } = body;
  if (!username || !previousPassword || !currentPassword || price == null) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  const acc = await Accounts.create({
    username,
    previousPassword,
    currentPassword,
    price: Number(price),
    category,
    notes,
    status: status || "active",
  });
  await Logs.create({
    action: "account_create",
    targetId: acc.id,
    detail: username,
    adminUid: session.adminUid,
  });
  return NextResponse.json({ ok: true, account: toPublicAccount(acc) });
}
