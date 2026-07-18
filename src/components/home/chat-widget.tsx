"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Image as ImageIcon, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Message } from "@/types";

const SESSION_KEY = "gomen_chat_session";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id =
      "anon_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 10);
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/** Compress an image File to a JPEG data URL ≤ ~900 KB (Firestore doc limit). */
async function fileToCompressedDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("not_an_image");
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read_failed"));
    reader.readAsDataURL(file);
  });
  if (file.size < 250_000) return dataUrl;
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("decode_failed"));
    i.src = dataUrl;
  });
  const maxDim = 1024;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.7);
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSeenLengthRef = useRef(0);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  const startOrLoad = useCallback(async () => {
    if (!sessionId) return;
    setLoadingHistory(true);
    try {
      await fetch("/api/chat/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const msgRes = await fetch(
        `/api/chat/messages?sessionId=${encodeURIComponent(sessionId)}`,
        { cache: "no-store" }
      );
      if (!msgRes.ok) throw new Error("load_failed");
      const data = await msgRes.json();
      setMessages(data.messages || []);
      lastSeenLengthRef.current = (data.messages || []).length;
    } catch {
      toast.error("Couldn't open chat. Please retry.");
    } finally {
      setLoadingHistory(false);
    }
  }, [sessionId]);

  // Poll for new messages while the panel is open.
  useEffect(() => {
    if (!open || !sessionId) return;
    startOrLoad();
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/chat/messages?sessionId=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = await res.json();
        const next = data.messages || [];
        setMessages(next);
        lastSeenLengthRef.current = next.length;
      } catch {
        /* ignore */
      } finally {
        pollRef.current = setTimeout(poll, 3000);
      }
    };
    pollRef.current = setTimeout(poll, 3000);
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [open, sessionId, startOrLoad]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  function onOpen() {
    setOpen(true);
  }

  // Allow other components (e.g. the "talk to me" link) to open the chat.
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("gomen:open-chat", handler);
    return () => window.removeEventListener("gomen:open-chat", handler);
  }, []);

  async function onSend() {
    const trimmed = text.trim();
    if (!trimmed || !sessionId || busy) return;
    setBusy(true);
    const optimistic: Message = {
      id: "tmp_" + Date.now(),
      chatId: "",
      sender: "user",
      text: trimmed,
      imageUrl: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setText("");
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, text: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "send_failed");
      }
      const data = await res.json();
      setMessages((m) =>
        m.map((msg) => (msg.id === optimistic.id ? data.message : msg))
      );
      lastSeenLengthRef.current += 1;
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
    if (!file || !sessionId || busy) return;
    setBusy(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      const optimistic: Message = {
        id: "tmp_" + Date.now(),
        chatId: "",
        sender: "user",
        text: null,
        imageUrl: dataUrl,
        createdAt: new Date().toISOString(),
      };
      setMessages((m) => [...m, optimistic]);
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, imageUrl: dataUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "send_failed");
      }
      const data = await res.json();
      setMessages((m) =>
        m.map((msg) => (msg.id === optimistic.id ? data.message : msg))
      );
      lastSeenLengthRef.current += 1;
    } catch (e) {
      toast.error(
        e instanceof Error && e.message === "not_an_image"
          ? "Please choose an image file."
          : "Image upload failed."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Full-width "Chat with me" button — matches search bar width */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
        className="mx-auto w-full max-w-2xl"
      >
        <Button
          onClick={onOpen}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium shadow-xl shadow-violet-500/20"
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          Chat with me
        </Button>
      </motion.div>

      {/* Chat modal overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setOpen(false)} // click outside to close
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex h-[32rem] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur-xl sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()} // don't close when clicking inside
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/60 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                    <MessageCircle className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-sm font-medium">Chat with admin</div>
                    <div className="text-[10px] text-muted-foreground">
                      Anonymous · replies usually within minutes
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full"
                  onClick={() => setOpen(false)}
                  aria-label="Close chat"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 space-y-3 overflow-y-auto p-3"
              >
                {loadingHistory && messages.length === 0 && (
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Loading…
                  </div>
                )}
                {!loadingHistory && messages.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                    Say hi 👋 — send a text or image and the admin will reply.
                  </div>
                )}
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))}
              </div>

              {/* Composer */}
              <div className="border-t border-border/60 p-2">
                <div className="flex items-end gap-1">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onFileChange}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-lg"
                    onClick={() => fileRef.current?.click()}
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
                    placeholder="Type a message…"
                    className="h-10 border-0 bg-muted/40"
                    disabled={busy}
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-lg"
                    onClick={onSend}
                    disabled={busy || !text.trim()}
                    aria-label="Send message"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.sender === "user";
  const [copied, setCopied] = useState(false);
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Password reveal — prominent emerald card with copy button.
  if (message.passwordReveal) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[90%] rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
          <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            🔑 Your password
          </div>
          <code className="block break-all font-mono text-base font-semibold text-foreground">
            {message.text}
          </code>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(message.text || "");
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {}
              }}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-500/30 dark:text-emerald-300"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" /> Copy password
                </>
              )}
            </button>
            <span className="text-[10px] text-muted-foreground">{time}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
          isUser
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
            isUser ? "text-white/70" : "text-muted-foreground"
          }`}
        >
          {time}
        </div>
      </div>
    </div>
  );
}
