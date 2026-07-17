import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const diag: Record<string, unknown> = {
    nodeVersion: process.version,
    runtime: "nodejs",
  };

  // Check env vars (without leaking values)
  diag.env = {
    FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
    FIREBASE_PRIVATE_KEY_length: (process.env.FIREBASE_PRIVATE_KEY || "").length,
    ENCRYPTION_SECRET: !!process.env.ENCRYPTION_SECRET,
  };

  // Try importing firebase-admin
  try {
    const admin = await import("firebase-admin/app");
    diag.adminApp = Object.keys(admin);
  } catch (e) {
    diag.adminAppError = e instanceof Error ? e.message : String(e);
  }

  // Try importing firestore subpath
  try {
    const fs = await import("firebase-admin/firestore");
    diag.firestoreModule = Object.keys(fs).slice(0, 10);
  } catch (e) {
    diag.firestoreModuleError = e instanceof Error ? e.message : String(e);
  }

  // Try initializing Firebase
  try {
    const { firebaseEnabled, getFirestore, initError } = await import("@/lib/firebase-admin");
    diag.firebaseEnabled = firebaseEnabled;
    diag.initError = initError;
    const firestore = getFirestore();
    diag.firestoreReady = !!firestore;
    if (firestore) {
      const snap = await firestore.collection("accounts").limit(1).get();
      diag.firestoreQuery = `ok (docs: ${snap.size})`;
    }
  } catch (e) {
    diag.firebaseError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    diag.firebaseStack = e instanceof Error ? e.stack?.slice(0, 500) : null;
  }

  return NextResponse.json(diag);
}
