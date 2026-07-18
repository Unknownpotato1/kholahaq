"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Lock, ArrowRight, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/shared/copy-button";
import { Skeleton } from "@/components/ui/skeleton";
import { BuyAccessModal } from "@/components/search/buy-access-modal";
import { toast } from "sonner";
import type { AccountPublic } from "@/types";

export default function SearchPageInner() {
  const params = useSearchParams();
  const initialQ = params.get("q") || "";
  const [q, setQ] = useState(initialQ);
  const [items, setItems] = useState<AccountPublic[] | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (query: string) => {
    // Empty query = no search. Accounts are never listed by default.
    const trimmed = query.trim();
    if (!trimmed) {
      setItems(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setItems(null);
    try {
      const res = await fetch(
        `/api/accounts/search?q=${encodeURIComponent(trimmed)}`,
        { cache: "no-store" }
      );
      if (res.status === 429) {
        toast.error("Too many searches. Please slow down.");
        setItems([]);
        return;
      }
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      toast.error("Failed to search. Please retry.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = q.trim();
      const url = new URL(window.location.href);
      if (trimmed) url.searchParams.set("q", trimmed);
      else url.searchParams.delete("q");
      window.history.replaceState({}, "", url.toString());
      runSearch(trimmed);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, runSearch]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runSearch(q.trim());
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Search accounts
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Type a username. Matches show the previous password publicly and the
          current password locked behind a verified payment.
        </p>

        <form onSubmit={onSubmit} className="mt-6">
          <div className="group flex items-center gap-2 rounded-2xl border border-border/60 bg-background/60 p-2 shadow-xl shadow-black/5 backdrop-blur-xl transition focus-within:border-violet-500/60 focus-within:ring-2 focus-within:ring-violet-500/20">
            <Search className="ml-2 h-5 w-5 shrink-0 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search Username..."
              className="h-12 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
              aria-label="Search username"
              autoComplete="off"
              autoFocus
            />
            <Button type="submit" size="lg" className="h-12 rounded-xl px-5">
              Search
            </Button>
          </div>
        </form>
      </motion.div>

      <div className="mt-8">
        {loading && <SearchSkeleton />}

        {!loading && items === null && <IdleState />}

        {!loading && items !== null && items.length === 0 && (
          <EmptyState query={q} />
        )}

        {!loading && items !== null && items.length > 0 && (
          <div className="grid gap-4">
            <AnimatePresence mode="popLayout">
              {items.map((a) => (
                <AccountCard key={a.id} account={a} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="mt-12 text-center">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">← Back to home</Link>
        </Button>
      </div>
    </div>
  );
}

function AccountCard({ account }: { account: AccountPublic }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-border/60 bg-background/60 p-5 backdrop-blur-xl sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-violet-600 dark:text-violet-300">
            <Lock className="h-4 w-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold tracking-tight">
                {account.username}
              </span>
              <CopyButton value={account.username} label="Copy username" />
            </div>
            <div className="text-xs text-muted-foreground">
              {account.category} · updated{" "}
              {new Date(account.updatedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
        <Badge
          variant={account.status === "active" ? "default" : "secondary"}
          className="capitalize"
        >
          {account.status}
        </Badge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Previous Password
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <code className="text-sm font-medium break-all">
              {account.previousPassword}
            </code>
            <CopyButton value={account.previousPassword} label="" />
          </div>
        </div>

        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Current Password
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm font-medium text-violet-600 dark:text-violet-300">
            <Lock className="h-4 w-4" /> 🔒 Locked
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Pay ₹{account.price} to unlock · one-time token
          </div>
        </div>
      </div>

      {account.notes && (
        <div className="mt-3 rounded-lg border border-border/40 bg-background/40 p-3 text-xs text-muted-foreground">
          {account.notes}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between">
        <div>
          <span className="text-2xl font-semibold">₹{account.price}</span>
          <span className="ml-1 text-xs text-muted-foreground">incl. taxes</span>
        </div>
        <BuyButton account={account} />
      </div>
    </motion.div>
  );
}

function BuyButton({ account }: { account: AccountPublic }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setModalOpen(true)}
        size="lg"
        className="min-w-32"
      >
        Buy Access <ArrowRight className="ml-1 h-4 w-4" />
      </Button>
      <BuyAccessModal
        account={account}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

function SearchSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-56 w-full rounded-2xl" />
      ))}
    </div>
  );
}

function IdleState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-12 text-center"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-muted"
      >
        <Search className="h-7 w-7 text-muted-foreground" />
      </motion.div>
      <h3 className="text-lg font-medium">Type a username to begin</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Accounts only appear here when you search for them.
      </p>
    </motion.div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-12 text-center"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-muted"
      >
        <SearchX className="h-7 w-7 text-muted-foreground" />
      </motion.div>
      <h3 className="text-lg font-medium">No accounts found</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        We couldn&apos;t find a match for &ldquo;{query}&rdquo;. Try a different
        username.
      </p>
    </motion.div>
  );
}
