"use client";

import { Suspense } from "react";
import SearchPageInner from "./search-page-inner";

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <div className="h-10 w-48 animate-pulse rounded bg-muted" />
        </div>
      }
    >
      <SearchPageInner />
    </Suspense>
  );
}
