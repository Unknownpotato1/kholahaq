/**
 * Firebase Auth client SDK singleton (browser only).
 * Used by the admin login page. Public firebaseConfig is safe to ship to
 * the client — Firebase Auth is protected by Firestore security rules
 * and the `admins` allow-list.
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseClientEnabled = Boolean(firebaseConfig.apiKey);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseClientEnabled) return null;
  if (app) return app;
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig as Record<string, string>);
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const a = getFirebaseApp();
  if (!a) return null;
  if (auth) return auth;
  auth = getAuth(a);
  return auth;
}
