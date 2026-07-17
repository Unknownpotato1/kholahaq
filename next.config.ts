import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Keep firebase-admin and its transitive deps as Node externals.
  // This prevents the bundler from trying to process firebase-admin's
  // subpath exports (auth, firestore) and their ESM-only dependencies
  // (jose, jwks-rsa) — which would otherwise break serverless builds.
  serverExternalPackages: [
    "firebase-admin",
    "firebase-admin/app",
    "firebase-admin/firestore",
    "firebase-admin/auth",
    "@firebase/database",
    "razorpay",
    "crypto-js",
  ],
};

export default nextConfig;
