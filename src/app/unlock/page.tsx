"use client";

import { Suspense } from "react";
import UnlockPageInner from "./unlock-page-inner";

export default function UnlockPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-violet-500" />
        </div>
      }
    >
      <UnlockPageInner />
    </Suspense>
  );
}
