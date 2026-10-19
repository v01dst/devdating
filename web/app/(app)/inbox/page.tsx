"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, type Notification } from "@/lib/api";
import { timeAgo } from "@/lib/timeAgo";

const TYPE_META: Record<string, { icon: string; label: string; classes: string }> = {
  MATCH: { icon: "♥", label: "Match", classes: "bg-accent/10 text-accent-soft" },
  MESSAGE: { icon: "✉", label: "Message", classes: "bg-signal/15 text-signal" },
  APPROVAL: { icon: "✓", label: "Approval", classes: "bg-like/15 text-like" },
  SYSTEM: { icon: "✦", label: "System", classes: "bg-ghost text-ink-soft" },
};

function metaFor(type: string) {
  return TYPE_META[type] ?? TYPE_META.SYSTEM;
}

export default function InboxPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["inbox"], queryFn: api.notifications });
  const notifications = data ?? [];
  const unreadCount = notifications.filter((item) => !item.read).length;
  const visible = filter === "unread" ? notifications.filter((item) => !item.read) : notifications;

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["inbox"] });
    void queryClient.invalidateQueries({ queryKey: ["unread-count"] });
  }

  async function open(notification: Notification) {
    if (!notification.read) {
      await api.markRead(notification.id).catch(() => {});
      refresh();
    }
    if (notification.link) router.push(notification.link);
  }

  async function markAll() {
    setBusy(true);
    try {
      await api.readAll();
      refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-ink">Inbox</h1>
          <p className="mt-2 text-ink-soft">
            Matches, messages, and contribution updates, pushed live while you work.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void markAll()}
          disabled={busy || unreadCount === 0}
          className="rounded-full border border-line bg-raised px-4 py-2 text-sm font-semibold text-ink-soft transition hover:border-ink/30 disabled:opacity-40"
        >
          {busy ? "Marking…" : "Mark all read"}
        </button>
      </div>

      <div className="mt-6 flex gap-2">
        {(["all", "unread"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filter === key ? "bg-accent text-white" : "bg-raised text-ink-soft hover:text-ink"
            }`}
          >
            {key === "all" ? `All (${notifications.length})` : `Unread (${unreadCount})`}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {isLoading && (
          <>
            <div className="skeleton h-20 rounded-3xl" />
            <div className="skeleton h-20 rounded-3xl" />
            <div className="skeleton h-20 rounded-3xl" />
          </>
        )}

        {!isLoading && visible.length === 0 && (
          <div className="card rounded-3xl p-10 text-center">
            <p className="text-3xl text-accent-soft" aria-hidden>✦</p>
            <h2 className="mt-3 font-semibold text-ink">
              {filter === "unread" ? "No unread notifications" : "You're all caught up"}
            </h2>
            <p className="mt-1 text-sm text-ink-dim">
              {filter === "unread"
                ? "Everything here has been read already."
                : "Swipe some projects or send a message — updates will land here instantly."}
            </p>
          </div>
        )}

        {visible.map((notification) => {
          const meta = metaFor(notification.type);
          return (
            <button
              key={notification.id}
              type="button"
              onClick={() => void open(notification)}
              className={`card group flex w-full items-start gap-4 rounded-3xl p-4 text-left transition hover:border-accent/40 ${
                notification.read ? "" : "border-accent/30 bg-accent/10"
              }`}
            >
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-2xl text-lg ${meta.classes}`}
                aria-hidden
              >
                {meta.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={`truncate font-semibold ${notification.read ? "text-ink-soft" : "text-ink"}`}>
                    {notification.title}
                  </span>
                  {!notification.read && (
                    <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
                      new
                    </span>
                  )}
                </span>
                {notification.body && (
                  <span className="mt-1 block truncate text-sm text-ink-dim">{notification.body}</span>
                )}
                <span className="mt-2 flex items-center gap-2 text-xs text-ink-dim">
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${meta.classes}`}>{meta.label}</span>
                  <span>{timeAgo(notification.created_at)}</span>
                  {notification.link && <span className="text-accent-soft opacity-0 transition group-hover:opacity-100">open →</span>}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </main>
  );
}
