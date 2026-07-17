"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Lock, ArrowRight, SearchX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/shared/copy-button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { AccountPublic } from "@/types";

export default function SearchPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQ = params.get("q") || "";
  const [q, setQ] = useState(initialQ);
  const [items, setItems] = useState<AccountPublic[] | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (query: string) => {
    setLoading(true);
    setItems(null);
    try {
      const res = await fetch(
        `/api/accounts/search?q=${encodeURIComponent(query)}`,
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

        {!loading && items && items.length === 0 && <EmptyState query={q} />}

        {!loading && items && items.length > 0 && (
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
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function onBuy() {
    setBusy(true);
    try {
      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountId: account.id }),
      });
      if (!orderRes.ok) throw new Error("order_failed");
      const order = await orderRes.json();

      const paymentId = await openCheckout(order, account);
      if (!paymentId) throw new Error("payment_cancelled");

      const verifyRes = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orderId: order.orderId,
          paymentId,
          signature: order.mock ? "mock_signature" : "razorpay_checkout_signature",
          paymentDbId: order.paymentDbId,
        }),
      });
      if (!verifyRes.ok) {
        const err = await verifyRes.json().catch(() => ({}));
        throw new Error(err.error || "verify_failed");
      }
      const data = await verifyRes.json();
      toast.success("Payment verified! Redirecting to unlock…");
      setTimeout(() => router.push(data.redirectTo), 600);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "payment_failed";
      if (msg === "payment_cancelled") toast.info("Payment cancelled.");
      else toast.error("Payment failed. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button onClick={onBuy} disabled={busy} size="lg" className="min-w-32">
      {busy ? (
        <>
          <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Processing…
        </>
      ) : (
        <>
          Buy Access <ArrowRight className="ml-1 h-4 w-4" />
        </>
      )}
    </Button>
  );
}

async function openCheckout(
  order: {
    orderId: string;
    amount: number;
    keyId: string;
    mock: boolean;
    username: string;
  },
  account: AccountPublic
): Promise<string | null> {
  if (order.mock) {
    await new Promise((r) => setTimeout(r, 800));
    return `mock_pay_${Date.now()}`;
  }
  return new Promise((resolve, reject) => {
    const src = "https://checkout.razorpay.com/v1/checkout.js";
    const existing = document.querySelector(`script[src="${src}"]`);
    const finish = () => {
      const Razorpay = (
        window as unknown as {
          Razorpay?: new (opts: unknown) => {
            on: (e: string, cb: () => void) => void;
            open: () => void;
          };
        }
      ).Razorpay;
      if (!Razorpay) {
        reject(new Error("checkout_unavailable"));
        return;
      }
      const opts = {
        key: order.keyId,
        amount: order.amount,
        currency: "INR",
        name: "Gomen",
        description: `Unlock ${account.username}`,
        order_id: order.orderId,
        handler: (resp: { razorpay_payment_id: string }) =>
          resolve(resp.razorpay_payment_id),
        modal: { ondismiss: () => resolve("") },
        theme: { color: "#7c3aed" },
      };
      const rz = new Razorpay(opts);
      rz.on("payment.failed", () => resolve(""));
      rz.open();
    };
    if (existing) finish();
    else {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = finish;
      s.onerror = () => reject(new Error("checkout_unavailable"));
      document.body.appendChild(s);
    }
  });
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
        {query
          ? `We couldn't find a match for “${query}”. Try a different username.`
          : "Start typing to search the catalogue."}
      </p>
    </motion.div>
  );
}
