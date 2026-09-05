"use client";
import { useEffect, useState } from "react";
import { api, type DiscoveryCard } from "@/lib/api";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cards, setCards] = useState<DiscoveryCard[]>([]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((v) => !v); }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpenPalette = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("devdating:open-palette", onOpenPalette);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("devdating:open-palette", onOpenPalette);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    api.cards().then(setCards).catch(() => setCards([]));
  }, [open ]);
  if (!open) return null;
  const filtered = cards.filter((c) => (c.project.name + (c.project.description ?? "")).toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  return (
    <div className="fixed inset-0 z-[60] bg-zinc-950/40 p-4" onClick={() => setOpen(false)}>
      <div className="mx-auto mt-24 max-w-lg rounded-2xl border border-zinc-200 bg-white p-3 text-zinc-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects, or type: inbox, onboarding, tracking" className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none" />
        <div className="mt-2 flex flex-col">
          {filtered.map((c) => (
            <a key={c.project.id} href="/discover" className="rounded-xl px-3 py-2 text-zinc-900 hover:bg-zinc-100">
              <span className="font-semibold">{c.project.name}</span> <span className="text-zinc-500">· {Math.round(c.compatibility_score)}% · {(c.project.languages ?? []).join(", ")}</span>
            </a>
          ))}
          {filtered.length === 0 && <div className="px-3 py-4 text-sm text-zinc-500">No matches — try a language like python or typescript.</div>}
        </div>
      </div>
    </div>
  );
}
