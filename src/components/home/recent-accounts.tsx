"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "@/components/shared/copy-button";
import { Badge } from "@/components/ui/badge";
import type { AccountPublic } from "@/types";

export function RecentAccounts() {
  const [items, setItems] = useState<AccountPublic[] | null>(null);

  useEffect(() => {
    fetch("/api/recent", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]));
  }, []);

  if (items === null) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-10 text-center text-sm text-muted-foreground">
        No accounts yet. Add some from the admin panel.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((a, i) => (
        <motion.div
          key={a.id}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.4) }}
          className="group relative overflow-hidden rounded-2xl border border-border/60 bg-background/60 p-5 backdrop-blur-xl transition hover:border-violet-500/40 hover:shadow-xl hover:shadow-violet-500/5"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium tracking-tight">{a.username}</span>
            <Badge variant="secondary" className="text-xs">
              {a.category}
            </Badge>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Previous</span>
              <div className="flex items-center gap-1">
                <code className="rounded bg-muted px-2 py-0.5 text-xs">
                  {a.previousPassword}
                </code>
                <CopyButton value={a.previousPassword} label="" />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Current</span>
              <span className="inline-flex items-center gap-1 rounded bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-600 dark:text-violet-300">
                <Lock className="h-3 w-3" /> Locked
              </span>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <span className="text-lg font-semibold">₹{a.price}</span>
            <Button asChild size="sm" variant="default">
              <Link href={`/search?q=${encodeURIComponent(a.username)}`}>
                View <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
