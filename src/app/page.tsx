"use client";

import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { HomeSearch } from "@/components/home/home-search";
import { ChatWidgetButton } from "@/components/home/chat-widget";
import { EntryDisclaimer } from "@/components/home/entry-disclaimer";

const STEPS = [
  "Search the username of your lost account (exact spelling).",
  "Pay the amount shown on your account.",
  "The current password will be shown to you only.",
  "Change the password and the linked email or phone number.",
];

function openChat() {
  window.dispatchEvent(new Event("gomen:open-chat"));
}

export default function HomePage() {
  return (
    <div className="w-full">
      {/* Search + Chat — right below the header */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-500/25 via-fuchsia-500/15 to-transparent blur-3xl" />
        </div>

        <div className="mx-auto max-w-2xl px-4 pt-10 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full"
          >
            <HomeSearch />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-4 w-full"
          >
            <ChatWidgetButton />
          </motion.div>
        </div>
      </section>

      {/* Recovery guide — compact numbered list */}
      <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <motion.h2
          initial={{ opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-xl font-semibold tracking-tight sm:text-2xl"
        >
          Recover your account in 4 easy steps
        </motion.h2>

        <motion.ol
          initial={{ opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mt-4 space-y-1.5 text-sm leading-relaxed text-foreground"
        >
          {STEPS.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-semibold text-muted-foreground">
                {i + 1}.
              </span>
              <span>{s}</span>
            </li>
          ))}
        </motion.ol>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mt-4 text-sm font-medium text-emerald-700 dark:text-emerald-300"
        >
          Your account is recovered.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-3 text-sm text-muted-foreground"
        >
          If you have any doubt, please{" "}
          <button
            type="button"
            onClick={openChat}
            className="inline-flex items-center gap-1 font-medium text-violet-600 underline-offset-4 hover:underline dark:text-violet-300"
          >
            talk to me
            <MessageCircle className="h-3.5 w-3.5" />
          </button>
          .
        </motion.p>
      </section>

      {/* Entry disclaimer popup (shows once per session) */}
      <EntryDisclaimer />
    </div>
  );
}
