"use client";

import { Search, CreditCard, KeyRound, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

const STEPS = [
  {
    icon: Search,
    title: "1 · Search",
    body: "Type any username into the search bar. Gomen returns matching accounts with the previous password shown publicly and the current password shown as locked.",
  },
  {
    icon: CreditCard,
    title: "2 · Pay securely",
    body: "Click Buy Access. Razorpay creates an order, you pay with UPI / card / netbanking. The server verifies the payment signature — frontend success is never trusted.",
  },
  {
    icon: KeyRound,
    title: "3 · Unlock",
    body: "After verification, a random 64-character one-time token is minted. You land on /unlock?token=…, the backend decrypts the current password, marks the token used, and reveals it.",
  },
  {
    icon: ShieldCheck,
    title: "4 · Stay safe",
    body: "The token expires in 10 minutes and can only be used once. Refreshing the page shows 'token already used'. Copy your password immediately — there is no second chance.",
  },
];

export function HowItWorks() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((s, i) => (
        <motion.div
          key={s.title}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.08 }}
          className="rounded-2xl border border-border/60 bg-background/60 p-5 backdrop-blur-xl"
        >
          <div className="mb-3 inline-grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-violet-600 dark:text-violet-300">
            <s.icon className="h-5 w-5" />
          </div>
          <h3 className="font-medium">{s.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
        </motion.div>
      ))}
    </div>
  );
}
