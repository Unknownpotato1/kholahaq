import { NextResponse } from "next/server";
import { Accounts, toPublicAccount } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await Accounts.listRecent(6);
    return NextResponse.json({ items: items.map(toPublicAccount) });
  } catch (e) {
    console.error("[recent]", e);
    return NextResponse.json({ items: [] });
  }
}
