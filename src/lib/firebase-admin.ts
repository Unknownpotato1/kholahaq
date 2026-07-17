/**
 * Firebase Admin SDK singleton.
 *
 * - Reads service account credentials from env vars.
 * - If credentials are missing (sandbox/preview), `firebaseEnabled` is false
 *   and the app falls back to the Prisma-backed local DB.
 * - The credentials are NEVER exposed to the client — this module is
 *   imported only from server routes ("use server" / route handlers).
 */
import admin from "firebase-admin";

let app: admin.app.App | null = null;
let initError: string | null = null;

export const firebaseEnabled = Boolean(
  process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
);

export function getFirebaseAdmin(): admin.app.App | null {
  if (!firebaseEnabled) return null;
  if (app) return app;
  try {
    if (admin.apps.length > 0) {
      app = admin.app();
      return app;
    }
    const pk = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: pk,
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
    return app;
  } catch (e: unknown) {
    initError = e instanceof Error ? e.message : String(e);
    return null;
  }
}

export function getFirestore(): FirebaseFirestore.Firestore | null {
  const a = getFirebaseAdmin();
  if (!a) return null;
  return a.firestore();
}

export function getAuth(): admin.auth.Auth | null {
  const a = getFirebaseAdmin();
  if (!a) return null;
  return a.auth();
}

export { initError };
