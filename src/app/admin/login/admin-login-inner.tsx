"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Shield, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AdminLoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/admin/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "login_failed");
      }
      toast.success("Welcome back, admin");
      router.push(from);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-16 sm:px-6">
      <div className="w-full rounded-2xl border border-border/60 bg-background/60 p-6 backdrop-blur-xl sm:p-8">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/30">
            <Shield className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Admin login</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Restricted access. Authorised admins only.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                placeholder="admin@gomen.local"
                required
                autoComplete="email"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Demo credentials:{" "}
          <code className="rounded bg-muted px-1 py-0.5">admin@gomen.local</code>{" "}
          /{" "}
          <code className="rounded bg-muted px-1 py-0.5">gomen-admin</code>
        </p>
      </div>
    </div>
  );
}
