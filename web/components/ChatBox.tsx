"use client";

import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { ensureSocket, socketErrorMessage } from "@/lib/socket";

type Message = { id: string; conversation_id?: string; sender_user_id: string; body: string; created_at: string };

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

    // Shared Socket.IO client (see lib/socket.ts) — one connection per tab,
    // authenticated with a short-lived token that survives reconnects.
    const socket = ensureSocket();
    socketRef.current = socket;

    const join = () => {
      setConnected(true);
      socket.emit("join", { conversation_id: conversationId });
    };
    const onConnect = () => join();
    const onDisconnect = () => setConnected(false);
    const onError = (payload: { detail?: string }) => setError(socketErrorMessage(payload));
    const onMessage = (message: Message) => {
      if (message.conversation_id && message.conversation_id !== conversationId) return;
      setMessages((existing) =>
        existing.some((item) => item.id === message.id) ? existing : [...existing, message],
      );
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("error", onError);
    socket.on("message", onMessage);
    if (socket.connected) join();

    return () => {
      cancelled = true;
      socket.emit("leave", { conversation_id: conversationId });
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("error", onError);
      socket.off("message", onMessage);
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
        <h2 className="font-semibold text-ink">Conversation</h2>
        <span className={`text-xs ${connected ? "text-like" : "text-ink-dim"}`}>
          {connected ? "● live" : "○ reconnecting…"}
        </span>
      </div>
      <div ref={scrollRef} className="mt-4 h-80 space-y-3 overflow-y-auto pr-2">
        {messages.length === 0 && (
          <p className="text-sm text-ink-dim">
            Say hi! Note down what you plan to work on before claiming the issue.
          </p>
        )}
        {messages.map((message) => (
          <div key={message.id} className="flex flex-col items-end">
            <div className="max-w-[80%] rounded-2xl bg-accent/10 px-4 py-2 text-sm text-ink">{message.body}</div>
            <span className="mt-1 text-[10px] text-ink-dim">{formatTime(message.created_at)}</span>
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-heart">{error}</p>}
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
