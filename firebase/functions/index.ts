// =========================================================================
// GOMEN · Firebase Cloud Functions
// =========================================================================
// Optional helper functions. The Next.js app is the primary backend; these
// functions are wired up so you can move logic off Vercel serverless if you
// outgrow the platform.
//
// Deploy:
//   cd firebase && firebase deploy --only functions
//
// Required env (set with `firebase functions:secrets:set`):
//   ENCRYPTION_SECRET
//   RAZORPAY_KEY_ID
//   RAZORPAY_KEY_SECRET
//   RAZORPAY_WEBHOOK_SECRET
// =========================================================================

import * as functions from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as crypto from "crypto";

initializeApp();
const db = getFirestore();

const TOKEN_TTL_MS = 10 * 60 * 1000;

function encryptPassword(plaintext: string, secret: string): string {
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

function decryptPassword(ciphertext: string, secret: string): string {
  const key = crypto.createHash("sha256").update(secret).digest();
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}

/**
 * Razorpay webhook — secondary confirmation.
 * Primary trust source is the Next.js /api/payment/verify endpoint.
 *
 * URL: https://<region>-<project>.cloudfunctions.net/razorpayWebhook
 */
export const razorpayWebhook = functions.onRequest(
  { secrets: ["RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "ENCRYPTION_SECRET"] },
  async (req, res) => {
    const raw = req.rawBody.toString();
    const sig = req.headers["x-razorpay-signature"] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(raw)
      .digest("hex");
    if (expected !== sig) {
      res.status(400).json({ error: "bad_signature" });
      return;
    }

    const event = req.body as {
      event?: string;
      payload?: {
        payment?: {
          entity?: {
            id?: string;
            order_id?: string;
            amount?: number;
            notes?: { accountId?: string; username?: string };
          };
        };
      };
    };

    if (event.event !== "payment.captured") {
      res.json({ ok: true, ignored: event.event });
      return;
    }

    const entity = event.payload?.payment?.entity;
    if (!entity?.order_id) {
      res.json({ ok: true, ignored: true });
      return;
    }

    const snap = await db
      .collection("payments")
      .where("orderId", "==", entity.order_id)
      .limit(1)
      .get();
    if (snap.empty) {
      res.json({ ok: true, ignored: "no_payment_row" });
      return;
    }
    const payDoc = snap.docs[0]!;
    const pay = payDoc.data() as { status?: string; accountId?: string };
    if (pay.status === "paid") {
      res.json({ ok: true, idempotent: true });
      return;
    }

    await payDoc.ref.update({ status: "paid", paymentId: entity.id });

    const token = crypto.randomBytes(32).toString("hex");
    await db.collection("unlockTokens").add({
      token,
      accountId: pay.accountId,
      paymentId: entity.id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      used: false,
    });

    res.json({ ok: true });
  }
);

/**
 * Server-side unlock — verifies a token and returns the decrypted password.
 * Mirrors the Next.js /api/unlock endpoint for cases where you want to
 * route unlock traffic through Firebase Functions instead.
 */
export const unlockWithToken = functions.onRequest(
  { secrets: ["ENCRYPTION_SECRET"], cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "method_not_allowed" });
      return;
    }
    const { token } = req.body as { token?: string };
    if (!token || token.length !== 64) {
      res.status(400).json({ error: "invalid_token" });
      return;
    }
    const snap = await db
      .collection("unlockTokens")
      .where("token", "==", token)
      .limit(1)
      .get();
    if (snap.empty) {
      res.status(404).json({ error: "invalid_token" });
      return;
    }
    const tDoc = snap.docs[0]!;
    const t = tDoc.data() as {
      used?: boolean;
      expiresAt?: { toDate?: () => Date } | string;
      accountId?: string;
    };
    if (t.used) {
      res.status(410).json({ error: "already_used" });
      return;
    }
    const expiresAt =
      typeof t.expiresAt === "object" && t.expiresAt?.toDate
        ? t.expiresAt.toDate()
        : new Date(t.expiresAt as string);
    if (expiresAt.getTime() < Date.now()) {
      res.status(410).json({ error: "expired" });
      return;
    }

    const accDoc = await db.collection("accounts").doc(t.accountId!).get();
    if (!accDoc.exists) {
      res.status(404).json({ error: "account_unavailable" });
      return;
    }
    const acc = accDoc.data() as { currentPasswordEnc?: string; username?: string };
    const password = decryptPassword(acc.currentPasswordEnc!, process.env.ENCRYPTION_SECRET!);

    await tDoc.ref.update({ used: true });
    await db.collection("logs").add({
      action: "unlock_success",
      targetId: t.accountId,
      detail: `token ${tDoc.id}`,
      createdAt: new Date(),
    });

    res.json({ password, consumed: true, username: acc.username });
  }
);
