"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
export default function Inbox() {
  const { data, refetch } = useQuery({ queryKey: ["inbox"], queryFn: () => (api as unknown as { notifications: () => Promise<{ id: string; title: string; body: string; link: string; read: boolean }[]> }).notifications() });
  return (<main className="mx-auto max-w-3xl px-6 py-10">
    <h1 className="text-3xl font-bold">Inbox</h1>
    <button className="mt-2 text-sm underline" onClick={async () => { await (api as unknown as { readAll: () => Promise<unknown> }).readAll(); refetch(); }}>Mark all read</button>
    <div className="mt-4 flex flex-col gap-2">{(data ?? []).map((n) => (<div key={n.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10"><div className="font-semibold">{n.read ? "" : "• "}{n.title}</div><div className="text-sm opacity-70">{n.body}</div></div>))}</div>
  </main>);
}
