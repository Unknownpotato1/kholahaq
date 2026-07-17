"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Lock,
  ShieldAlert,
  TimerOff,
  Loader2,
  Copy,
  Check,
  KeyRound,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type State =
  | { kind: "loading" }
  | { kind: "ready"; password: string; username?: string }
  | { kind: "used" }
  | { kind: "expired" }
  | { kind: "invalid" }
  | { kind: "error"; message: string };

export default function UnlockPageInner() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<State>({ kind: "loading" });
  const [copied, setCopied] = useState(false);

  const verify = useCallback(async () => {
    if (!token || token.length !== 64) {
      setState({ kind: "invalid" });
      return;
    }
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setState({
          kind: "ready",
          password: data.password,
          username: data.username,
        });
        return;
      }
      if (data.error === "already_used") setState({ kind: "used" });
      else if (data.error === "expired") setState({ kind: "expired" });
      else if (data.error === "invalid_token") setState({ kind: "invalid" });
      else setState({ kind: "error", message: data.error || "unknown" });
    } catch {
      setState({ kind: "error", message: "network" });
    }
  }, [token]);

  useEffect(() => {
    verify();
  }, [verify]);

  async function copyPassword() {
    if (state.kind !== "ready") return;
    try {
      await navigator.clipboard.writeText(state.password);
      setCopied(true);
      toast.success("Password copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't access clipboard");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <AnimatePresence mode="wait">
        {state.kind === "loading" && <LoadingView key="loading" />}

        {state.kind === "ready" && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 backdrop-blur-xl sm:p-8">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                  <CheckCircle2 className="h-6 w-6" />
                </span>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">
                    Payment verified
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Your one-time unlock is ready.
                  </p>
                </div>
              </div>

              {state.username && (
                <div className="mt-5 text-sm text-muted-foreground">
                  Account:{" "}
                  <span className="font-medium text-foreground">
                    {state.username}
                  </span>
                </div>
              )}

              <div className="mt-4 rounded-xl border border-border/60 bg-background/80 p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <KeyRound className="h-3 w-3" /> Current Password
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <code className="break-all font-mono text-lg font-semibold tracking-tight">
                    {state.password}
                  </code>
                  <Button
                    onClick={copyPassword}
                    size="lg"
                    className="min-w-32"
                  >
                    {copied ? (
                      <>
                        <Check className="mr-1 h-4 w-4" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 h-4 w-4" /> Copy Password
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  <strong>Token will not work again.</strong> Copy the password
                  now — refreshing or sharing this URL will show “token already
                  used”.
                </p>
              </div>

              <div className="mt-6 text-center">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/search">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Search another account
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {state.kind === "used" && (
          <ErrorView
            key="used"
            icon={<Lock className="h-7 w-7" />}
            title="This token has already been used"
            body="Each unlock token is single-use. Once the password is revealed, the token is permanently consumed. If you need to unlock again, you'll need to make another purchase."
          />
        )}

        {state.kind === "expired" && (
          <ErrorView
            key="expired"
            icon={<TimerOff className="h-7 w-7" />}
            title="Token expired"
            body="Unlock tokens are valid for 10 minutes after payment. This one has expired. Please make a new purchase to retrieve the password."
          />
        )}

        {state.kind === "invalid" && (
          <ErrorView
            key="invalid"
            icon={<ShieldAlert className="h-7 w-7" />}
            title="Invalid token"
            body="The token in your URL doesn't look right. Make sure you used the full link that was generated after your payment."
          />
        )}

        {state.kind === "error" && (
          <ErrorView
            key="error"
            icon={<ShieldAlert className="h-7 w-7" />}
            title="Something went wrong"
            body={`An unexpected error occurred: ${state.message}. Please try again or contact support.`}
            retry={verify}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function LoadingView() {
  return (
    <motion.div
      key="loading"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="rounded-2xl border border-border/60 bg-background/60 p-10 text-center backdrop-blur-xl"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-violet-600 dark:text-violet-300"
      >
        <Loader2 className="h-7 w-7" />
      </motion.div>
      <h2 className="text-lg font-medium">Verifying token…</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Checking signature, expiry, and use-status.
      </p>
    </motion.div>
  );
}

function ErrorView({
  icon,
  title,
  body,
  retry,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  retry?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center backdrop-blur-xl"
    >
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
        {icon}
      </div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {retry && (
          <Button onClick={retry} variant="outline">
            Retry
          </Button>
        )}
        <Button asChild variant="ghost">
          <Link href="/search">Back to search</Link>
        </Button>
      </div>
    </motion.div>
  );
}
