import { NextRequest, NextResponse } from "next/server";
import { createAdminSession } from "@/lib/admin-session";
import { firebaseEnabled, getAuth } from "@/lib/firebase-admin";
import { Logs } from "@/lib/repository";
import { randomBytes } from "crypto";
import { db as prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LoginBody {
  idToken?: string;
  email?: string;
  password?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as LoginBody;

  if (!firebaseEnabled) {
    // Sandbox login: accept configured demo credentials.
    const demoEmail = process.env.ADMIN_DEMO_EMAIL || "admin@gomen.local";
    const demoPass = process.env.ADMIN_DEMO_PASSWORD || "gomen-admin";
    if (body.email === demoEmail && body.password === demoPass) {
      // Mint a demo session directly (sandbox only).
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
      await prisma.adminSession.create({
        data: { token, adminUid: "demo-admin", email: demoEmail, expiresAt },
      });
      await Logs.create({
        action: "admin_login",
        detail: `demo login ${demoEmail}`,
        adminUid: "demo-admin",
      });
      const res = NextResponse.json({ ok: true });
      res.cookies.set("gomen_admin", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 8 * 60 * 60,
      });
      return res;
    }
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  // Production: verify Firebase ID token.
  if (!body.idToken) {
    return NextResponse.json({ error: "idToken required" }, { status: 400 });
  }
  try {
    const auth = getAuth();
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
