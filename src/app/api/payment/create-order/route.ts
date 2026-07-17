import { NextRequest, NextResponse } from "next/server";
import { Accounts } from "@/lib/repository";
import { Payments } from "@/lib/repository";
import { getRazorpay, razorpayEnabled } from "@/lib/razorpay";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { randomBytes } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CreateOrderBody {
  accountId?: string;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `order:${ip}`, limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: CreateOrderBody = {};
  try {
    body = (await req.json()) as CreateOrderBody;
  } catch {
    /* empty body is OK */
  }
  const accountId = body.accountId;
  if (!accountId) {
    return NextResponse.json({ error: "accountId required" }, { status: 400 });
  }

  const account = await Accounts.getById(accountId);
  if (!account || account.status !== "active") {
    return NextResponse.json({ error: "account_not_found" }, { status: 404 });
  }

  // Amount is in paise (INR). Always read from DB — never trust client.
  const amount = Math.max(1, Math.floor(account.price)) * 100;

  // Mock mode for sandbox/preview.
  if (!razorpayEnabled) {
    const orderId = `mock_order_${randomBytes(8).toString("hex")}`;
    const payment = await Payments.create({
      orderId,
      amount,
      status: "created",
      username: account.username,
      accountId: account.id,
    });
    return NextResponse.json({
      orderId,
      paymentDbId: payment.id,
      amount,
      currency: "INR",
      keyId: "mock_key",
      mock: true,
      username: account.username,
    });
  }

  // Real Razorpay order creation.
  const rz = getRazorpay()!;
  const order = await rz.orders.create({
    amount,
    currency: "INR",
    receipt: `gomen_${account.id}_${Date.now()}`,
    notes: { accountId: account.id, username: account.username },
  });
  const payment = await Payments.create({
    orderId: order.id,
    amount,
    status: "created",
    username: account.username,
    accountId: account.id,
  });
  return NextResponse.json({
    orderId: order.id,
    paymentDbId: payment.id,
    amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID!,
    mock: false,
    username: account.username,
  });
}
