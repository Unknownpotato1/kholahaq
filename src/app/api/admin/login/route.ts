import { NextRequest, NextResponse } from "next/server";
import { createAdminSession, createEnvAdminSession } from "@/lib/admin-session";
import { firebaseEnabled, getAuth } from "@/lib/firebase-admin";
import { Logs } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LoginBody {
  idToken?: string;
  email?: string;
  password?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as LoginBody;

  // Mode 1: Firebase ID token (full Firebase Auth, if client SDK is configured).
  // Used when NEXT_PUBLIC_FIREBASE_API_KEY is set and the admin logs in
  // via the Firebase client SDK.
  if (body.idToken && firebaseEnabled) {
    try {
      const { getAuth } = await import("@/lib/firebase-admin");
      const auth = await getAuth();
      if (!auth) throw new Error("Firebase Auth not initialized");
      await createAdminSession(body.idToken);
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "login_failed" },
        { status: 401 }
      );
    }
  }

  // Mode 2: Email + password (env-based, works with or without Firebase).
  // The server checks credentials against ADMIN_DEMO_EMAIL / ADMIN_DEMO_PASSWORD
  // env vars. If they match, a session is minted and stored in Firestore
  // (when Firebase is enabled) or Prisma (sandbox fallback).
  const expectedEmail = process.env.ADMIN_DEMO_EMAIL || "admin@gomen.local";
  const expectedPass = process.env.ADMIN_DEMO_PASSWORD || "gomen-admin";

  if (body.email === expectedEmail && body.password === expectedPass) {
    try {
      await createEnvAdminSession(expectedEmail);
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "session_failed" },
        { status: 500 }
      );
    }
  }

  // Neither mode succeeded.
  await Logs.create({
    action: "admin_login_failed",
    detail: `failed attempt for ${body.email || "(no email)"}`,
  });
  return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
}
