import { NextRequest, NextResponse } from "next/server";
import { Accounts, toPublicAccount } from "@/lib/repository";
import { rateLimit, getClientIp, sanitizeQuery } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `search:${ip}`, limit: 30, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: rl.retryAfter },
      { status: 429 }
    );
  }

  const url = new URL(req.url);
  const raw = url.searchParams.get("q") || "";
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = parseInt(url.searchParams.get("limit") || "12", 10);
  const q = sanitizeQuery(raw);

  try {
    const { items, total } = await Accounts.search(q, { page, limit });
    return NextResponse.json({
      query: q,
      items: items.map(toPublicAccount),
      total,
      page,
      limit,
    });
  } catch (e) {
    console.error("[search]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
