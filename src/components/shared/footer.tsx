import Link from "next/link";
import { Shield, Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto w-full border-t border-border/40 bg-background/60">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
              <Shield className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-medium">Gomen</span>
            <span className="text-xs text-muted-foreground">
              · Encrypted account marketplace
            </span>
          </div>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link href="/search" className="hover:text-foreground transition-colors">
              Search
            </Link>
            <Link href="/admin/login" className="hover:text-foreground transition-colors">
              Admin
            </Link>
            <a
              href="#"
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              aria-label="GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
          </nav>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Gomen. Payments secured by Razorpay. Passwords encrypted with AES-256-GCM.
        </p>
      </div>
    </footer>
  );
}
