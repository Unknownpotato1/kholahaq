import { NextRequest, NextResponse } from "next/server";
import { UnlockTokens, Accounts, Logs } from "@/lib/repository";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface UnlockBody {
  token?: string;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `unlock:${ip}`, limit: 15, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = (await req.json()) as UnlockBody;
  const token = body.token;
  if (!token || token.length !== 64) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  const row = await UnlockTokens.getByToken(token);
  if (!row) {
    await Logs.create({ action: "unlock_failed", detail: "unknown token" });
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }
  if (row.used) {
    await Logs.create({
      action: "unlock_failed",
      targetId: row.id,
      detail: "token already used",
    });
    return NextResponse.json({ error: "already_used" }, { status: 410 });
  }
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    await Logs.create({
      action: "unlock_failed",
      targetId: row.id,
      detail: "token expired",
    });
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  // Decrypt password — only AFTER all checks pass.
  const password = await Accounts.revealCurrentPassword(row.accountId);
  if (!password) {
    return NextResponse.json({ error: "account_unavailable" }, { status: 404 });
  }

  // Mark token used. This MUST happen after decryption success but before
  // returning the password, so a crash between the two leaves a stale-used
  // token (safe) rather than a usable-but-leaked one (unsafe).
  await UnlockTokens.markUsed(row.id);
  await Logs.create({
    action: "unlock_success",
    targetId: row.accountId,
    detail: `token ${row.id}`,
  });

  // Tell the client to mark this token "consumed" so a refresh shows
  // the "already used" page instead of re-revealing.
  return NextResponse.json({
    password,
    consumed: true,
    username: (await Accounts.getById(row.accountId))?.username,
  });
}
