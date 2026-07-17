import { NextResponse } from "next/server";
import { destroyAdminSession, getAdminSession } from "@/lib/admin-session";
import { Logs } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const s = await getAdminSession();
  if (s) {
    await Logs.create({
      action: "admin_logout",
      detail: s.email,
      adminUid: s.adminUid,
    });
  }
  await destroyAdminSession();
  return NextResponse.json({ ok: true });
}
