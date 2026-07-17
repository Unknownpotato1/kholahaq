"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Full-screen disclaimer modal shown when a visitor enters the website.
 * - Shows once per browser session (sessionStorage flag).
 * - Bold red title indicating importance.
 * - Closeable via the X button or clicking outside the card.
 */
export function EntryDisclaimer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("gomen_disclaimer_seen");
    if (!seen) {
      // Small delay so it animates in after the page settles.
      const t = setTimeout(() => setOpen(true), 400);
      return () => clearTimeout(t);
    }
  }, []);

  function close() {
    setOpen(false);
    sessionStorage.setItem("gomen_disclaimer_seen", "1");
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={close} // click outside to close
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-red-500/40 bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()} // don't close when clicking inside
          >
            {/* Red header bar */}
            <div className="flex items-center justify-between border-b border-red-500/30 bg-red-500/10 px-5 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <h2 className="text-base font-bold uppercase tracking-wide text-red-600 dark:text-red-400">
                  Important — Please Read Before Proceeding
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 rounded-full"
                onClick={close}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Body */}
            <div className="px-5 py-5">
              <p className="text-sm leading-relaxed text-foreground">
                I have nothing to do with your account, I only want some money
                to get braces on my teeth, believe me this time you&apos;ll not
                get scammed, after the payment you will be able to see your
                current password, you can log in and reset your password,
                I&apos;ll not keep your account with me even after the payment
                because I don&apos;t want your account, I only want some money.
                My path is wrong but I had no options so forgive me if possible.
              </p>

              <div className="mt-5 flex justify-end">
                <Button onClick={close} className="min-w-24">
                  I understand
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
