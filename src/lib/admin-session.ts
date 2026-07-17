/**
 * Admin session cookie management.
 *
 * - On admin login we verify the Firebase ID token server-side, then mint
 *   a random http-only session cookie that we store in the DB.
 * - Middleware reads this cookie and validates it against the DB.
 * - We do NOT rely on Firebase client cookies for route protection —
 *   the server is the source of truth.
 */
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { db as prisma } from "@/lib/db";
import { getFirestore, firebaseEnabled, getAuth } from "@/lib/firebase-admin";
import { Admins, Logs } from "@/lib/repository";

const COOKIE = "gomen_admin";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

interface SessionRow {
  token: string;
  adminUid: string;
  email: string;
  expiresAt: Date;
}

async function getSession(token: string): Promise<SessionRow | null> {
  if (!token) return null;
  if (firebaseEnabled) {
    const fs = getFirestore()!;
    const snap = await fs.collection("adminSessions").where("token", "==", token).limit(1).get();
    if (snap.empty) return null;
    const d = snap.docs[0];
    const a = d.data();
    const expiresAt =
      a.expiresAt && typeof a.expiresAt.toDate === "function"
        ? (a.expiresAt.toDate() as Date)
        : new Date(a.expiresAt);
    return { token, adminUid: a.adminUid, email: a.email, expiresAt };
  }
  const row = await prisma.adminSession.findUnique({ where: { token } });
  if (!row) return null;
  return {
    token: row.token,
    adminUid: row.adminUid,
    email: row.email,
    expiresAt: row.expiresAt,
  };
}

async function saveSession(s: SessionRow): Promise<void> {
  if (firebaseEnabled) {
    await getFirestore()!.collection("adminSessions").add(s);
    return;
  }
  await prisma.adminSession.create({ data: s });
}

async function deleteSession(token: string): Promise<void> {
  if (firebaseEnabled) {
    const fs = getFirestore()!;
    const snap = await fs.collection("adminSessions").where("token", "==", token).limit(1).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
    return;
  }
  try {
    await prisma.adminSession.deleteMany({ where: { token } });
  } catch {
    /* ignore */
  }
}

export async function createAdminSession(idToken: string): Promise<void> {
  // Verify the Firebase ID token.
  const auth = getAuth();
  if (!auth) {
    throw new Error("Firebase Auth is not initialised");
  }
  const decoded = await auth.verifyIdToken(idToken);
  const uid = decoded.uid;
  const email = decoded.email || "";
  const isAdmin = await Admins.isAdminUid(uid);
  if (!isAdmin) {
    await Logs.create({
      action: "admin_login_failed",
      targetId: uid,
      detail: `non-admin attempted login (${email})`,
      adminUid: uid,
    });
    throw new Error("Not an admin");
  }
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + MAX_AGE_SECONDS * 1000);
  await saveSession({ token, adminUid: uid, email, expiresAt });
  await Logs.create({
    action: "admin_login",
    targetId: uid,
    detail: email,
    adminUid: uid,
  });
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await deleteSession(token);
  store.delete(COOKIE);
}

export async function getAdminSession(): Promise<SessionRow | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const s = await getSession(token);
  if (!s) return null;
  if (s.expiresAt.getTime() < Date.now()) {
    await deleteSession(token);
    return null;
  }
  return s;
}

/**
 * Verify the caller is admin — throw 401 otherwise.
 * Returns the session for use in audit logs.
 */
export async function requireAdmin(): Promise<SessionRow> {
  const s = await getAdminSession();
  if (!s) {
    throw new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return s;
}
