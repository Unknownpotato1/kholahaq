"use client";

import Link from "next/link";
import { WifiOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-24 text-center">
      <div className="mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-muted">
        <WifiOff className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">You&apos;re offline</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Gomen needs a network connection to search accounts and process
        payments. Reconnect and try again.
      </p>
      <Button className="mt-6" onClick={() => window.location.reload()}>
        <RotateCcw className="mr-1 h-4 w-4" /> Retry
      </Button>
      <Button asChild variant="ghost" size="sm" className="mt-2">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
