"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
export default function Inbox() {
  const { data, refetch } = useQuery({ queryKey: ["inbox"], queryFn: () => (api as unknown as { notifications: () => Promise<{ id: string; title: string; body: string; link: string; read: boolean }[]> }).notifications() });
  return (<main className="mx-auto max-w-3xl px-6 py-10">
    <h1 className="text-3xl font-bold text-zinc-900">Inbox</h1>
    <button className="mt-2 text-sm text-zinc-600 underline hover:text-zinc-900" onClick={async () => { await (api as unknown as { readAll: () => Promise<unknown> }).readAll(); refetch(); }}>Mark all read</button>
    <div className="mt-4 flex flex-col gap-2">{(data ?? []).map((n) => (<div key={n.id} className="card p-3"><div className="font-semibold text-zinc-900">{n.read ? "" : "• "}{n.title}</div><div className="text-sm text-zinc-600">{n.body}</div></div>))}</div>
  </main>);
}
