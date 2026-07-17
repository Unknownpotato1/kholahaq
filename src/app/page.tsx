"use client";

import { motion } from "framer-motion";
import { Search, CreditCard, KeyRound, ShieldCheck, MessageCircle, CheckCircle2 } from "lucide-react";
import { HomeSearch } from "@/components/home/home-search";
import { ChatWidget } from "@/components/home/chat-widget";
import { EntryDisclaimer } from "@/components/home/entry-disclaimer";

const STEPS = [
  {
    icon: Search,
    title: "Step 1",
    body: "Search the username of your lost account (use the exact spelling).",
  },
  {
    icon: CreditCard,
    title: "Step 2",
    body: "Pay the amount shown on your account.",
  },
  {
    icon: KeyRound,
    title: "Step 3",
    body: "The current password will be shown to you only.",
  },
  {
    icon: ShieldCheck,
    title: "Step 4",
    body: "Change the password and the linked email or phone number.",
  },
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
            <ChatWidget />
          </motion.div>
        </div>
      </section>

      {/* Recovery guide */}
      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Recover your account in 4 easy steps
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A simple, transparent process — start to finish.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="relative rounded-2xl border border-border/60 bg-background/60 p-5 backdrop-blur-xl"
            >
              <div className="mb-3 inline-grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-violet-600 dark:text-violet-300">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {s.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-foreground">
                {s.body}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Success callout */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="font-medium text-emerald-700 dark:text-emerald-300">
            Your account is recovered.
          </span>
        </motion.div>

        {/* Talk-to-me footer */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="mt-8 text-center text-sm text-muted-foreground"
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
