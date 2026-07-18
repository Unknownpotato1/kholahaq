"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, CreditCard, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AccountPublic } from "@/types";

// Razorpay hosted payment page link.
// Replace via NEXT_PUBLIC_RAZORPAY_PAYMENT_LINK env var if needed.
const RAZORPAY_PAYMENT_LINK =
  process.env.NEXT_PUBLIC_RAZORPAY_PAYMENT_LINK ||
  "https://rzp.io/rzp/lhOBr4wu";

// The chat page URL customers land on after payment.
const CHAT_PAGE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") +
  "/chat" ||
  "https://kholahaq.vercel.app/chat";

interface BuyAccessModalProps {
  account: AccountPublic;
  open: boolean;
  onClose: () => void;
}

export function BuyAccessModal({ account, open, onClose }: BuyAccessModalProps) {
  function goToPayment() {
    // Open the Razorpay payment page in a new tab.
    window.open(RAZORPAY_PAYMENT_LINK, "_blank", "noopener,noreferrer");
    onClose();
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
            {/* Header */}
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

            {/* Body */}
            <div className="px-5 py-5">
              {/* Amount */}
              <div className="text-center">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Amount to pay
                </div>
                <div className="mt-1 text-3xl font-bold">₹{account.price}</div>
              </div>

              {/* Steps */}
              <ol className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-bold text-violet-600 dark:text-violet-300">
                    1
                  </span>
                  <span>
                    Tap{" "}
                    <span className="font-medium text-foreground">
                      Go to payment page
                    </span>{" "}
                    below. You&apos;ll be taken to Razorpay&apos;s secure
                    payment page.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-bold text-violet-600 dark:text-violet-300">
                    2
                  </span>
                  <span>
                    Pay ₹{account.price} using UPI, card, or netbanking.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-bold text-violet-600 dark:text-violet-300">
                    3
                  </span>
                  <span>
                    After payment, you&apos;ll be redirected to a chat page.
                    A message{" "}
                    <span className="font-medium text-foreground">
                      &ldquo;I&apos;ve paid, now give me access&rdquo;
                    </span>{" "}
                    will be sent automatically.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-bold text-violet-600 dark:text-violet-300">
                    4
                  </span>
                  <span>
                    I&apos;ll verify your payment and send the current password
                    in the same chat. Only you can see it.
                  </span>
                </li>
              </ol>

              {/* CTA */}
              <Button
                onClick={goToPayment}
                className="mt-5 w-full"
                size="lg"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Go to payment page
                <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </Button>

              {/* Chat page hint */}
              <p className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
                <MessageCircle className="h-3 w-3" />
                After payment you&apos;ll land on the chat page
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
