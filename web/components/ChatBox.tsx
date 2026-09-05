"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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

    // Realtime updates over Socket.IO, connected directly to the API origin so
    // WebSocket upgrades are not dropped by the Next.js rewrite proxy.
    const socket = io(API_ORIGIN, { path: "/socket.io", transports: ["websocket", "polling"] });
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
    <section className="card mt-5 flex flex-col rounded-3xl p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-zinc-900">Conversation</h2>
        <span className={`text-xs ${connected ? "text-emerald-600" : "text-zinc-500"}`}>
          {connected ? "● live" : "○ reconnecting…"}
        </span>
      </div>
      <div ref={scrollRef} className="mt-4 h-80 space-y-3 overflow-y-auto pr-2">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500">
            Say hi! Note down what you plan to work on before claiming the issue.
          </p>
        )}
        {messages.map((message) => (
          <div key={message.id} className="flex flex-col items-end">
            <div className="max-w-[80%] rounded-2xl bg-violet-100 px-4 py-2 text-sm text-zinc-900">{message.body}</div>
            <span className="mt-1 text-[10px] text-zinc-500">{formatTime(message.created_at)}</span>
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
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
          className="input flex-1"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="btn-primary px-5 py-3 transition disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </section>
  );
}
