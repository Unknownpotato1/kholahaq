import { NextRequest, NextResponse } from "next/server";
import { Payments, UnlockTokens, Logs } from "@/lib/repository";
import { verifyRazorpaySignature, razorpayEnabled } from "@/lib/razorpay";
import { generateToken } from "@/lib/crypto";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Razorpay webhook handler.
 *
 * In production, configure this URL in the Razorpay dashboard:
 *   https://yourdomain.com/api/webhooks/razorpay
 * Razorpay will POST signed events here. We only act on `payment.captured`.
 *
 * The verify endpoint (/api/payment/verify) is the primary trust source —
 * this webhook is a secondary confirmation that lets the unlock email
 * (if you wire one up) go out even if the user closes the browser tab.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("x-razorpay-signature") || "";

  // Webhook signature uses a different secret (webhook secret, not key secret).
  // For sandbox we accept anything; for production we verify HMAC.
  if (razorpayEnabled) {
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET || "")
      .update(raw)
      .digest("hex");
    if (expected !== sig) {
      return NextResponse.json({ error: "bad_signature" }, { status: 400 });
    }
  }

  const event = JSON.parse(raw) as {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          amount?: number;
          status?: string;
          notes?: { accountId?: string; username?: string };
        };
      };
    };
  };

  if (event.event !== "payment.captured") {
    return NextResponse.json({ ok: true, ignored: event.event });
  }

  const entity = event.payload?.payment?.entity;
  if (!entity?.order_id) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const payment = await Payments.getByOrderId(entity.order_id);
  if (!payment) {
    return NextResponse.json({ ok: true, ignored: "no_payment_row" });
  }
  if (payment.status === "paid") {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  await Payments.updateStatus(payment.id, "paid", entity.id);
  await Logs.create({
    action: "payment_webhook",
    targetId: payment.id,
    detail: `${payment.username} ₹${payment.amount / 100}`,
  });

  const token = generateToken();
  await UnlockTokens.create({
    token,
    accountId: payment.accountId,
    paymentId: entity.id,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  return NextResponse.json({ ok: true });
}
