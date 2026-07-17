import { NextRequest, NextResponse } from "next/server";
import { Accounts, toPublicAccount, Logs } from "@/lib/repository";
import { requireAdmin } from "@/lib/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  const { id } = await params;
  const body = await req.json();
  const { username, previousPassword, currentPassword, price, category, notes, status } = body;
  const updated = await Accounts.update(id, {
    username,
    previousPassword,
    currentPassword,
    price: price != null ? Number(price) : undefined,
    category,
    notes,
    status,
  });
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  await Logs.create({
    action: "account_update",
    targetId: id,
    detail: username,
    adminUid: session.adminUid,
  });
  return NextResponse.json({ ok: true, account: toPublicAccount(updated) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  const { id } = await params;
  await Accounts.delete(id);
  await Logs.create({
    action: "account_delete",
    targetId: id,
    adminUid: session.adminUid,
  });
  return NextResponse.json({ ok: true });
}
