/**
 * Firebase Admin SDK singleton.
 *
 * - Reads service account credentials from env vars.
 * - If credentials are missing (sandbox/preview), `firebaseEnabled` is false
 *   and the app falls back to the Prisma-backed local DB.
 * - The credentials are NEVER exposed to the client — this module is
 *   imported only from server routes ("use server" / route handlers).
 *
 * Note: firebase-admin v14 moved Firestore and Auth to subpath exports.
 * We import them from "firebase-admin/firestore" and "firebase-admin/auth"
 * respectively, then call getFirestore(app) / getAuth(app) with the
 * initialized app instance.
 *
 * IMPORTANT: The "firebase-admin/auth" module pulls in jwks-rsa → jose
 * (ESM-only), which breaks when Next.js bundles it with Turbopack/webpack.
 * We lazy-load `getAuth` via dynamic import() so it's only evaluated when
 * actually called, and we add `firebase-admin` to serverExternalPackages
 * in next.config.ts so the bundler doesn't try to bundle its internals.
 */
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore as fsGetFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | null = null;
let initError: string | null = null;

export const firebaseEnabled = Boolean(
  process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
);

export function getFirebaseAdmin(): App | null {
  if (!firebaseEnabled) return null;
  if (app) return app;
  try {
    if (getApps().length > 0) {
      app = getApps()[0]!;
      return app;
    }
    const pk = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
    app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: pk,
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
    return app;
  } catch (e: unknown) {
    initError = e instanceof Error ? e.message : String(e);
    console.error("[firebase-admin] init failed:", initError);
    return null;
  }
}

export function getFirestore(): Firestore | null {
  const a = getFirebaseAdmin();
  if (!a) return null;
  return fsGetFirestore(a);
}

/**
 * Lazy-load Firebase Auth. Only used by the Firebase ID token login flow
 * (createAdminSession). The env-based login (createEnvAdminSession) never
 * touches this, so the jwks-rsa/jose ESM chain is never loaded for the
 * common case.
 */
export async function getAuth(): Promise<import("firebase-admin/auth").Auth | null> {
  const a = getFirebaseAdmin();
  if (!a) return null;
  const { getAuth } = await import("firebase-admin/auth");
  return getAuth(a);
}

export { initError };
