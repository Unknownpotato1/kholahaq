import { NextRequest, NextResponse } from "next/server";
import { Payments, UnlockTokens, Logs } from "@/lib/repository";
import { verifyRazorpaySignature, razorpayEnabled } from "@/lib/razorpay";
import { generateToken } from "@/lib/crypto";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface VerifyBody {
  orderId?: string;
  paymentId?: string;
  signature?: string;
  // Mock-mode clients send paymentDbId so we can locate the row even
  // without a real Razorpay signature.
  paymentDbId?: string;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `verify:${ip}`, limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = (await req.json()) as VerifyBody;
  const { orderId, paymentId, signature, paymentDbId } = body;

  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  // Locate the payment row.
  let payment = await Payments.getByOrderId(orderId);
  if (!payment && paymentDbId) {
    payment = (await Payments.list(1000)).find((p) => p.id === paymentDbId) || null;
  }
  if (!payment) {
    return NextResponse.json({ error: "payment_not_found" }, { status: 404 });
  }
  if (payment.status === "paid") {
    // Idempotency — already verified.
    return NextResponse.json({ error: "already_paid" }, { status: 409 });
  }

  // Verify signature (or accept mock signature in sandbox).
  const sig = signature || "mock_signature";
  const okSignature = razorpayEnabled
    ? verifyRazorpaySignature(orderId, paymentId || "", sig)
    : sig === "mock_signature";

  if (!okSignature) {
    await Payments.updateStatus(payment.id, "failed", paymentId);
    await Logs.create({
      action: "payment_failed",
      targetId: payment.id,
      detail: `signature mismatch for ${orderId}`,
    });
    return NextResponse.json({ error: "signature_invalid" }, { status: 400 });
  }

  // Mark payment as paid.
  await Payments.updateStatus(payment.id, "paid", paymentId);
  await Logs.create({
    action: "payment_verified",
    targetId: payment.id,
    detail: `${payment.username} ₹${payment.amount / 100}`,
  });

  // Mint a one-time 64-char token, valid 10 min.
  const token = generateToken();
  await UnlockTokens.create({
    token,
    accountId: payment.accountId,
    paymentId: paymentId || payment.id,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });

  return NextResponse.json({
    token,
    redirectTo: `/unlock?token=${token}`,
  });
}
