"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, Sparkles } from "lucide-react";
import { HomeSearch } from "@/components/home/home-search";
import { RecentAccounts } from "@/components/home/recent-accounts";
import { HowItWorks } from "@/components/home/how-it-works";
import { Faq } from "@/components/home/faq";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="w-full">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-500/30 via-fuchsia-500/20 to-transparent blur-3xl" />
          <div className="absolute top-20 -right-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur"
          >
            <Sparkles className="h-3 w-3 text-fuchsia-500" />
            Encrypted account marketplace · AES-256-GCM
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mx-auto max-w-3xl text-center text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl"
          >
            Search a username.{" "}
            <span className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
              Unlock the password.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mt-4 max-w-xl text-center text-base text-muted-foreground sm:text-lg"
          >
            Gomen shows the previous password publicly. The current password is
            encrypted at rest and revealed only after a verified Razorpay
            payment, behind a one-time token that expires in 10 minutes.
          </motion.p>

          <div className="mt-8">
            <HomeSearch />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm">
            <Button asChild variant="outline">
              <Link href="/search">Browse all accounts</Link>
            </Button>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> No login required
              for customers
            </span>
          </div>
        </div>
      </section>

      {/* RECENT */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Recent accounts</h2>
            <p className="text-sm text-muted-foreground">
              Freshly updated entries in the catalogue.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/search">View all →</Link>
          </Button>
        </div>
        <RecentAccounts />
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
          <p className="text-sm text-muted-foreground">
            Four steps from search to unlocked password.
          </p>
        </div>
        <HowItWorks />
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">FAQ</h2>
          <p className="text-sm text-muted-foreground">
            Security and payment questions, answered.
          </p>
        </div>
        <Faq />
      </section>
    </div>
  );
}
