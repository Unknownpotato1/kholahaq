"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function HomeSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = q.trim();
      // Only navigate when there's an actual query — empty searches do nothing.
      if (!trimmed) return;
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    },
    [q, router]
  );

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mx-auto w-full max-w-2xl"
    >
      <div className="group relative flex items-center gap-2 rounded-2xl border border-border/60 bg-background/60 p-2 shadow-xl shadow-black/5 backdrop-blur-xl transition focus-within:border-violet-500/60 focus-within:ring-2 focus-within:ring-violet-500/20">
        <Search className="ml-2 h-5 w-5 shrink-0 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Username..."
          className="h-12 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
          aria-label="Search username"
          autoComplete="off"
        />
        <Button
          type="submit"
          size="lg"
          className="h-12 rounded-xl px-5"
          disabled={!q.trim()}
        >
          Search <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </motion.form>
  );
}
