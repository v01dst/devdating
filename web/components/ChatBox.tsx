"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

type Message = { id: string; sender_user_id: string; body: string; created_at: string };

export function ChatBox({ conversationId }: { conversationId: string }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const response = await fetch(
        `/backend/api/v1/conversations/${conversationId}/messages?limit=100&order=asc`,
        { credentials: "same-origin" },
      );
      if (!response.ok) throw new Error("Could not load messages");
      return response.json() as Promise<Message[]>;
    },
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      const response = await fetch(`/backend/api/v1/conversations/${conversationId}/messages`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!response.ok) throw new Error(`Send failed (${response.status})`);
      return response.json();
    },
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });

  const messages = [...(messagesQuery.data ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  return (
    <section className="glass-card mt-5 flex flex-col rounded-3xl p-6">
      <h2 className="font-semibold">Conversation</h2>
      <div ref={scrollRef} className="mt-4 h-80 space-y-3 overflow-y-auto pr-2">
        {messages.length === 0 && (
          <p className="text-sm text-white/55">
            Say hi! Note down what you plan to work on before claiming the issue.
          </p>
        )}
        {messages.map((message) => (
          <div key={message.id} className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl bg-accent/20 px-4 py-2 text-sm">{message.body}</div>
          </div>
        ))}
        {messagesQuery.isLoading && <p className="text-sm text-white/45">Loading…</p>}
      </div>
      <form
        className="mt-4 flex gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.trim()) sendMutation.mutate(draft.trim());
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
          disabled={sendMutation.isPending || !draft.trim()}
          className="rounded-2xl bg-accent px-5 font-medium transition hover:bg-accent-soft disabled:opacity-50"
        >
          Send
        </button>
      </form>
      {sendMutation.isError && <p className="mt-2 text-sm text-red-400">Could not send that message.</p>}
    </section>
  );
}
