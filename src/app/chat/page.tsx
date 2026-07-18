"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Send, Image as ImageIcon, Loader2, Copy, Check, Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Message } from "@/types";

const SESSION_KEY = "gomen_chat_session";
const NAME_KEY = "gomen_chat_name";
const AUTO_SEND_KEY = "gomen_chat_autosent";
const TRIGGER_MESSAGE = "I've paid, now give me access";

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

async function fileToCompressedDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("not_an_image");
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

export default function ChatPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [typingPending, setTypingPending] = useState(false);
  const [needsName, setNeedsName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSentRef = useRef(false);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
    // Check if the visitor has a saved name.
    const savedName = localStorage.getItem(NAME_KEY);
    if (!savedName) {
      setNeedsName(true);
    }
  }, []);

  const loadMessages = useCallback(async (sid: string) => {
    try {
      const res = await fetch(
        `/api/chat/messages?sessionId=${encodeURIComponent(sid)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data = await res.json();
      const all: Message[] = data.messages || [];
      const now = Date.now();
      // Visible messages: createdAt <= now.
      const visible = all.filter(
        (m) => new Date(m.createdAt).getTime() <= now
      );
      // If there's a future-dated admin message, show typing bubble.
      const hasPending = all.some(
        (m) => m.sender === "admin" && new Date(m.createdAt).getTime() > now
      );
      setMessages(visible);
      setTypingPending(hasPending);
    } catch {
      /* ignore */
    }
  }, []);

  // Bootstrap: ensure chat thread exists + auto-send trigger message once.
  // Wait for the visitor to enter their name first (if needed).
  useEffect(() => {
    if (!sessionId) return;
    if (needsName && !nameSubmitted) return;
    (async () => {
      setLoading(true);
      try {
        const savedName = localStorage.getItem(NAME_KEY) || "";
        await fetch("/api/chat/start", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId, displayName: savedName || undefined }),
        });
        await loadMessages(sessionId);

        // Auto-send the trigger message once per browser session.
        const alreadySent = sessionStorage.getItem(AUTO_SEND_KEY);
        if (!alreadySent && !autoSentRef.current) {
          autoSentRef.current = true;
          sessionStorage.setItem(AUTO_SEND_KEY, "1");
          await sendTriggerMessage(sessionId);
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, nameSubmitted, needsName]);

  function onSubmitName() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    localStorage.setItem(NAME_KEY, trimmed);
    setNeedsName(false);
    setNameSubmitted(true);
  }

  async function sendTriggerMessage(sid: string) {
    setBusy(true);
    const optimistic: Message = {
      id: "tmp_" + Date.now(),
      chatId: "",
      sender: "user",
      text: TRIGGER_MESSAGE,
      imageUrl: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setText("");
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: sid, text: TRIGGER_MESSAGE }),
      });
      if (!res.ok) throw new Error("send_failed");
      const data = await res.json();
      setMessages((m) =>
        m.map((msg) => (msg.id === optimistic.id ? data.message : msg))
      );
      if (data.autoReplyScheduled) {
        setTypingPending(true);
      }
    } catch {
      toast.error("Failed to send message");
      setMessages((m) => m.filter((msg) => msg.id !== optimistic.id));
    } finally {
      setBusy(false);
    }
  }

  // Poll for new messages.
  useEffect(() => {
    if (!sessionId || loading) return;
    const poll = async () => {
      await loadMessages(sessionId);
      pollRef.current = setTimeout(poll, 3000);
    };
    pollRef.current = setTimeout(poll, 3000);
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [sessionId, loading, loadMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingPending]);

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
      if (!res.ok) throw new Error("send_failed");
      const data = await res.json();
      setMessages((m) =>
        m.map((msg) => (msg.id === optimistic.id ? data.message : msg))
      );
    } catch {
      toast.error("Failed to send");
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
      if (!res.ok) throw new Error("send_failed");
      const data = await res.json();
      setMessages((m) =>
        m.map((msg) => (msg.id === optimistic.id ? data.message : msg))
      );
    } catch {
      toast.error("Image upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col px-4 py-6 sm:px-6">
      {/* Name prompt gate */}
      {needsName ? (
        <div className="mx-auto flex w-full max-w-sm flex-col justify-center py-16">
          <div className="rounded-2xl border border-border/60 bg-background/60 p-6 backdrop-blur-xl">
            <div className="mb-4 text-center">
              <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/30">
                <Shield className="h-6 w-6" />
              </span>
              <h1 className="text-xl font-semibold">Before we chat…</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                What should I call you? This helps me find our conversation.
              </p>
            </div>
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSubmitName();
              }}
              placeholder="Your name"
              maxLength={40}
              autoFocus
              className="h-11"
            />
            <Button
              onClick={onSubmitName}
              disabled={!nameInput.trim()}
              className="mt-3 w-full"
              size="lg"
            >
              Continue to chat
            </Button>
          </div>
        </div>
      ) : (
        <>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
            <Shield className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Chat with admin</h1>
            <p className="text-xs text-muted-foreground">
              Anonymous · replies usually within minutes
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Home
        </Button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border/60 bg-background/60 p-4"
      >
        {loading && (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Loading…
          </div>
        )}
        {!loading && messages.length === 0 && !typingPending && (
          <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
            Say hi 👋 — send a text or image and the admin will reply.
          </div>
        )}
        {!loading &&
          messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        {typingPending && !loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="mt-3 rounded-2xl border border-border/60 bg-background/60 p-2">
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
        </>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.sender === "user";
  const [copied, setCopied] = useState(false);
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

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
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
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
    </motion.div>
  );
}
