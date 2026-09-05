"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
export default function Tracking() {
  const { data } = useQuery({ queryKey: ["tracking"], queryFn: () => (api as unknown as { contributions: () => Promise<{ id: string; repo: string; issue_number: number; state: string }[]> }).contributions() });
  return (<main className="mx-auto max-w-3xl px-6 py-10">
    <h1 className="text-3xl font-bold">Contribution tracking</h1>
    <p className="opacity-70">interested → claimed → pr_open → merged</p>
    <div className="mt-4 flex flex-col gap-2">{(data ?? []).map((c) => (<div key={c.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10"><span className="font-mono text-xs">{c.state}</span> <span className="font-semibold">{c.repo}#{c.issue_number}</span></div>))}</div>
  </main>);
}
