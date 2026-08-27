"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

type Message = { id: string; sender_user_id: string; body: string; created_at: string };

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatBox({ conversationId }: { conversationId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial history load (REST).
    let cancelled = false;
    fetch(`/backend/api/v1/conversations/${conversationId}/messages?limit=100&order=asc`, {
      credentials: "same-origin",
    })
      .then((response) => (response.ok ? response.json() : []))
      .then((history: Message[]) => {
        if (!cancelled) setMessages(history);
      })
      .catch(() => {});

    // Realtime updates over Socket.IO (same-origin /backend proxy).
    const socket = io("/backend", { path: "/backend/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("error", (payload: { detail: string }) => setError(payload.detail));
    socket.on("message", (message: Message) => {
      setMessages((existing) =>
        existing.some((item) => item.id === message.id) ? existing : [...existing, message],
      );
    });
    socket.emit("join", { conversation_id: conversationId });

    return () => {
      cancelled = true;
      socket.disconnect();
    };
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  function send() {
    const body = draft.trim();
    if (!body || !socketRef.current) return;
    socketRef.current.emit("message", { conversation_id: conversationId, body });
    setDraft("");
  }

  return (
    <section className="glass-card mt-5 flex flex-col rounded-3xl p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Conversation</h2>
        <span className={`text-xs ${connected ? "text-emerald-300" : "text-white/40"}`}>
          {connected ? "● live" : "○ reconnecting…"}
        </span>
      </div>
      <div ref={scrollRef} className="mt-4 h-80 space-y-3 overflow-y-auto pr-2">
        {messages.length === 0 && (
          <p className="text-sm text-white/55">
            Say hi! Note down what you plan to work on before claiming the issue.
          </p>
        )}
        {messages.map((message) => (
          <div key={message.id} className="flex flex-col items-end">
            <div className="max-w-[80%] rounded-2xl bg-accent/20 px-4 py-2 text-sm">{message.body}</div>
            <span className="mt-1 text-[10px] text-white/35">{formatTime(message.created_at)}</span>
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      <form
        className="mt-4 flex gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a message…"
          className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="rounded-2xl bg-accent px-5 font-medium transition hover:bg-accent-soft disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </section>
  );
}