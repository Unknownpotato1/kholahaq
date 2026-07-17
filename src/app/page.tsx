"use client";

import { HomeSearch } from "@/components/home/home-search";
import { ChatWidget } from "@/components/home/chat-widget";

export default function HomePage() {
  return (
    <div className="w-full">
      {/* HERO + SEARCH */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-500/30 via-fuchsia-500/20 to-transparent blur-3xl" />
        </div>

        <div className="mx-auto flex max-w-4xl flex-col items-center justify-center px-4 py-24 sm:px-6 sm:py-32">
          <h1 className="text-center text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Search a username.{" "}
            <span className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
              Unlock the password.
            </span>
          </h1>

          <p className="mt-4 max-w-xl text-center text-base text-muted-foreground sm:text-lg">
            Type any username to look it up. Results appear only after you search.
          </p>

          <div className="mt-10 w-full">
            <HomeSearch />
          </div>
        </div>
      </section>

      {/* Floating anonymous chat with admin (text + image) */}
      <ChatWidget />
    </div>
  );
}
