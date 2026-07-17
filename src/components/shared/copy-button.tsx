"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  value: string;
  className?: string;
  label?: string;
  size?: "sm" | "md";
}

export function CopyButton({ value, className, label, size = "sm" }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);
  async function onCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={label || "Copy"}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
        "border border-border/60 bg-background/60 backdrop-blur",
        "hover:bg-accent hover:text-accent-foreground transition-colors",
        size === "sm" ? "text-xs" : "text-sm",
        className
      )}
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      <span>{copied ? "Copied" : label || "Copy"}</span>
    </button>
  );
}
