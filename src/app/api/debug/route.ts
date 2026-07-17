import { NextResponse } from "next/server";
import { firebaseEnabled, getFirestore, initError } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let fsStatus = "not_initialized";
  let fsError: string | null = null;
  try {
    const fs = getFirestore();
    if (fs) {
      const snap = await fs.collection("accounts").limit(1).get();
      fsStatus = `ok (docs: ${snap.size})`;
    } else {
      fsStatus = "null";
      fsError = initError;
    }
  } catch (e) {
    fsStatus = "error";
    fsError = e instanceof Error ? e.message : String(e);
  }
  return NextResponse.json({
    firebaseEnabled,
    fsStatus,
    fsError,
    hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    privateKeyLength: (process.env.FIREBASE_PRIVATE_KEY || "").length,
    nodeVersion: process.version,
  });
}
