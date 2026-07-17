"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Send, Image as ImageIcon, Loader2, MessageCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type { Chat, Message } from "@/types";

export function ChatManager() {
  const [chats, setChats] = useState<Chat[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadChats = useCallback(async () => {
    setChats(null);
    try {
      const res = await fetch("/api/admin/chat", { cache: "no-store" });
      if (res.status === 401) {
        toast.error("Session expired");
        return;
      }
      const data = await res.json();
      setChats(data.chats || []);
    } catch {
      toast.error("Failed to load chats");
      setChats([]);
    }
  }, []);

  const loadMessages = useCallback(async (chatId: string) => {
    setLoadingMessages(true);
    setMessages([]);
    try {
      const res = await fetch(`/api/admin/chat/${chatId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("load_failed");
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Poll the selected conversation + chat list for updates.
  useEffect(() => {
    if (!selectedId) return;
    const poll = async () => {
      try {
        const [msgRes, chatsRes] = await Promise.all([
          fetch(`/api/admin/chat/${selectedId}`, { cache: "no-store" }),
          fetch("/api/admin/chat", { cache: "no-store" }),
        ]);
        if (msgRes.ok) {
          const data = await msgRes.json();
          setMessages(data.messages || []);
        }
        if (chatsRes.ok) {
          const data = await chatsRes.json();
          setChats(data.chats || []);
        }
      } catch {
        /* ignore */
      } finally {
        pollRef.current = setTimeout(poll, 4000);
      }
    };
    pollRef.current = setTimeout(poll, 4000);
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [selectedId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function onSend() {
    const trimmed = text.trim();
    if (!trimmed || !selectedId || busy) return;
    setBusy(true);
    const optimistic: Message = {
      id: "tmp_" + Date.now(),
      chatId: selectedId,
      sender: "admin",
      text: trimmed,
      imageUrl: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setText("");
    try {
      const res = await fetch(`/api/admin/chat/${selectedId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "send_failed");
      }
      const data = await res.json();
      setMessages((m) =>
        m.map((msg) => (msg.id === optimistic.id ? data.message : msg))
      );
      // Refresh chat list so the lastMessageAt updates.
      loadChats();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
      setMessages((m) => m.filter((msg) => msg.id !== optimistic.id));
    } finally {
      setBusy(false);
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selectedId || busy) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(new Error("read_failed"));
        r.readAsDataURL(file);
      });
      const optimistic: Message = {
        id: "tmp_" + Date.now(),
        chatId: selectedId,
        sender: "admin",
        text: null,
        imageUrl: dataUrl,
        createdAt: new Date().toISOString(),
      };
      setMessages((m) => [...m, optimistic]);
      const res = await fetch(`/api/admin/chat/${selectedId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageUrl: dataUrl }),
      });
      if (!res.ok) throw new Error("send_failed");
      const data = await res.json();
      setMessages((m) =>
        m.map((msg) => (msg.id === optimistic.id ? data.message : msg))
      );
    } catch {
      toast.error("Image upload failed");
      setMessages((m) => m.filter((msg) => msg.id !== "tmp_" + optimistic.id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      {/* Chat list */}
      <div className="rounded-xl border border-border/60 bg-background/40">
        <div className="flex items-center justify-between border-b border-border/60 p-3">
          <span className="text-sm font-medium">Conversations</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={loadChats}
            aria-label="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <ScrollArea className="max-h-[30rem]">
          {!chats && (
            <div className="space-y-2 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}
          {chats && chats.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No conversations yet. Visitors will appear here when they send a message.
            </div>
          )}
          {chats &&
            chats.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedId(c.id);
                  loadMessages(c.id);
                }}
                className={`flex w-full items-center justify-between gap-2 border-b border-border/40 px-3 py-2.5 text-left transition hover:bg-accent/50 ${
                  selectedId === c.id ? "bg-accent/70" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {c.displayName}
                  </div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    {new Date(c.lastMessageAt).toLocaleString()}
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {c.sessionId.slice(0, 6)}
                </Badge>
              </button>
            ))}
        </ScrollArea>
      </div>

      {/* Conversation */}
      <div className="flex h-[32rem] flex-col rounded-xl border border-border/60 bg-background/40">
        {!selectedId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
            <MessageCircle className="h-10 w-10" />
            <div>Select a conversation to view messages.</div>
          </div>
        ) : (
          <>
            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto p-4"
            >
              {loadingMessages && (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Loading…
                </div>
              )}
              {!loadingMessages &&
                messages.map((m) => (
                  <AdminMessageBubble key={m.id} message={m} />
                ))}
            </div>
            <div className="border-t border-border/60 p-2">
              <div className="flex items-end gap-1">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFileChange}
                  id="admin-chat-file"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-lg"
                  onClick={() =>
                    document.getElementById("admin-chat-file")?.click()
                  }
                  disabled={busy}
                  aria-label="Attach image"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onSend();
                    }
                  }}
                  placeholder="Type a reply…"
                  className="h-10 border-0 bg-muted/40"
                  disabled={busy}
                />
                <Button
                  type="button"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-lg"
                  onClick={onSend}
                  disabled={busy || !text.trim()}
                  aria-label="Send reply"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AdminMessageBubble({ message }: { message: Message }) {
  const isAdmin = message.sender === "admin";
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
          isAdmin
            ? "rounded-br-sm bg-violet-500 text-white"
            : "rounded-bl-sm bg-muted text-foreground"
        }`}
      >
        {message.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.imageUrl}
            alt="Attached"
            className="mb-1 max-h-48 rounded-lg object-cover"
          />
        )}
        {message.text && (
          <div className="whitespace-pre-wrap break-words">{message.text}</div>
        )}
        <div
          className={`mt-1 text-[10px] ${
            isAdmin ? "text-white/70" : "text-muted-foreground"
          }`}
        >
          {time}
        </div>
      </div>
    </motion.div>
  );
}
