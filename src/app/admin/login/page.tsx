"use client";

import { Suspense } from "react";
import AdminLoginInner from "./admin-login-inner";

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-violet-500" />
        </div>
      }
    >
      <AdminLoginInner />
    </Suspense>
  );
}
