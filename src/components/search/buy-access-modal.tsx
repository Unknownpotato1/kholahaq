"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { AccountPublic } from "@/types";

const SESSION_KEY = "gomen_chat_session";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id =
      "anon_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 10);
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

interface BuyAccessModalProps {
  account: AccountPublic;
  open: boolean;
  onClose: () => void;
}

export function BuyAccessModal({ account, open, onClose }: BuyAccessModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  // Placeholder UPI ID — replace with real one via NEXT_PUBLIC_UPI_ID env var.
  const upiId = process.env.NEXT_PUBLIC_UPI_ID || "placeholder@upi";
  const upiName = "Gomen";
  const amount = account.price;
  const note = `Gomen ${account.username}`;

  useEffect(() => {
    if (!open) return;
    const upiUrl = `upi://pay?pa=${encodeURIComponent(
      upiId
    )}&pn=${encodeURIComponent(upiName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
    QRCode.toDataURL(upiUrl, {
      width: 240,
      margin: 2,
      color: { dark: "#0a0a0a", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [open, upiId, upiName, amount, note]);

  async function copyUpiId() {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  }

  async function onPaidOpenChat() {
    setSending(true);
    const sessionId = getOrCreateSessionId();
    try {
      await fetch("/api/chat/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const autoText = `I want to buy access to "${account.username}" (₹${amount}). Payment screenshot attached below. Please verify and send the password.`;
      await fetch("/api/chat/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, text: autoText }),
      });
      onClose();
      window.dispatchEvent(new Event("gomen:open-chat"));
      toast.success("Chat opened — attach your payment screenshot there.");
    } catch {
      toast.error("Something went wrong. Please try the chat button below.");
    } finally {
      setSending(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/60 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 px-5 py-3">
              <h2 className="text-base font-semibold">
                Buy access — {account.username}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="px-5 py-5">
              <div className="text-center">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Amount to pay
                </div>
                <div className="mt-1 text-3xl font-bold">₹{amount}</div>
              </div>

              <div className="mt-4 flex justify-center">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="UPI QR code"
                    className="h-56 w-56 rounded-xl border border-border/60"
                  />
                ) : (
                  <div className="grid h-56 w-56 place-items-center rounded-xl border border-border/60 bg-muted">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                <span className="text-muted-foreground">UPI ID:</span>
                <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
                  {upiId}
                </code>
                <button
                  type="button"
                  onClick={copyUpiId}
                  className="inline-flex items-center gap-1 text-xs text-violet-600 hover:underline dark:text-violet-300"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> Copy
                    </>
                  )}
                </button>
              </div>

              <ol className="mt-5 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
                <li>
                  <span className="font-semibold text-foreground">1.</span> Scan
                  the QR with any UPI app (GPay, PhonePe, Paytm) and pay ₹
                  {amount}.
                </li>
                <li>
                  <span className="font-semibold text-foreground">2.</span>{" "}
                  Take a screenshot of the successful payment.
                </li>
                <li>
                  <span className="font-semibold text-foreground">3.</span> Tap
                  the button below — it opens chat. Attach your screenshot
                  there.
                </li>
                <li>
                  <span className="font-semibold text-foreground">4.</span> I&apos;ll
                  verify and send the current password in the same chat. Only
                  you can see it.
                </li>
              </ol>

              <Button
                onClick={onPaidOpenChat}
                disabled={sending}
                className="mt-5 w-full"
                size="lg"
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Opening
                    chat…
                  </>
                ) : (
                  <>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    I&apos;ve paid — open chat to send screenshot
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
