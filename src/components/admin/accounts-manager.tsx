"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { AccountPublic } from "@/types";

export function AccountsManager() {
  const [items, setItems] = useState<AccountPublic[] | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<AccountPublic | null>(null);
  const [deleting, setDeleting] = useState<AccountPublic | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setItems(null);
    try {
      const res = await fetch(
        `/api/admin/accounts?q=${encodeURIComponent(q)}&page=${page}&limit=20`,
        { cache: "no-store" }
      );
      if (res.status === 401) {
        toast.error("Session expired");
        return;
      }
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("Failed to load accounts");
      setItems([]);
    }
  }, [q, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function onDelete(a: AccountPublic) {
    try {
      const res = await fetch(`/api/admin/accounts/${a.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(`Deleted ${a.username}`);
      setDeleting(null);
      load();
    } catch {
      toast.error("Delete failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search by username…"
            className="pl-9"
          />
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" /> Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add new account</DialogTitle>
              <DialogDescription>
                The current password is encrypted with AES-256-GCM before
                storage. It is never logged.
              </DialogDescription>
            </DialogHeader>
            <AccountForm
              onDone={() => {
                setCreateOpen(false);
                load();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border/60 bg-background/40">
        {!items && (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {items && items.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No accounts found.
          </div>
        )}
        {items && items.length > 0 && (
          <div className="divide-y divide-border/40">
            {items.map((a) => (
              <motion.div
                key={a.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-wrap items-center justify-between gap-3 p-3"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium">{a.username}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.category} · ₹{a.price} · prev: {a.previousPassword}
                    </div>
                  </div>
                  <Badge
                    variant={a.status === "active" ? "default" : "secondary"}
                    className="capitalize"
                  >
                    {a.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(a);
                      setEditOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleting(a)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {total > 20 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page} · {total} total
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit account</DialogTitle>
            <DialogDescription>
              Leave current password blank to keep the existing one.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <AccountForm
              account={editing}
              onDone={() => {
                setEditOpen(false);
                setEditing(null);
                load();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes{" "}
              <strong>{deleting?.username}</strong> and all related payment
              records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && onDelete(deleting)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AccountForm({
  account,
  onDone,
}: {
  account?: AccountPublic;
  onDone: () => void;
}) {
  const [username, setUsername] = useState(account?.username || "");
  const [previousPassword, setPreviousPassword] = useState(
    account?.previousPassword || ""
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [price, setPrice] = useState(String(account?.price ?? ""));
  const [category, setCategory] = useState(account?.category || "general");
  const [notes, setNotes] = useState(account?.notes || "");
  const [status, setStatus] = useState<"active" | "inactive">(
    account?.status || "active"
  );
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !previousPassword || (!account && !currentPassword) || !price) {
      toast.error("Please fill required fields");
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        username,
        previousPassword,
        price: Number(price),
        category,
        notes,
        status,
      };
      if (currentPassword) body.currentPassword = currentPassword;

      const url = account
        ? `/api/admin/accounts/${account.id}`
        : "/api/admin/accounts";
      const method = account ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "save_failed");
      }
      toast.success(account ? "Account updated" : "Account created");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="username">Username *</Label>
        <Input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="prev">Previous Password *</Label>
          <Input
            id="prev"
            value={previousPassword}
            onChange={(e) => setPreviousPassword(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cur">
            Current Password {account ? "(blank = keep)" : "*"}
          </Label>
          <Input
            id="cur"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required={!account}
            placeholder={account ? "••••••••" : ""}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="price">Price (₹) *</Label>
          <Input
            id="price"
            type="number"
            min={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cat">Category</Label>
          <Input
            id="cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={status === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatus("active")}
          >
            Active
          </Button>
          <Button
            type="button"
            variant={status === "inactive" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatus("inactive")}
          >
            Inactive
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving…
            </>
          ) : account ? (
            "Save changes"
          ) : (
            "Create account"
          )}
        </Button>
      </div>
    </form>
  );
}
