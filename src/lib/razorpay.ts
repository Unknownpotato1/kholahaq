/**
 * Razorpay client wrapper.
 *
 * - Reads RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET from env.
 * - If missing (sandbox/preview), the app uses a "mock" mode that
 *   simulates payment success so the full UX is demoable end-to-end.
 * - Secrets are NEVER exposed to the client.
 */
import Razorpay from "razorpay";
import crypto from "crypto";

export const razorpayEnabled = Boolean(
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
);

export function getRazorpay(): Razorpay | null {
  if (!razorpayEnabled) return null;
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

/**
 * Verify a Razorpay payment signature server-side.
 * Returns true if signature matches — never trust the client on this.
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!razorpayEnabled) {
    // Sandbox: skip verification. The mock checkout always sends a fixed
    // signature that we accept so the full payment flow can be demoed.
    return signature === "mock_signature";
  }
  // Real verification uses HMAC SHA256.
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex");
  return expected === signature;
}
