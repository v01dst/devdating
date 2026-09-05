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
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!open) return;
    api.cards().then(setCards).catch(() => setCards([]));
  }, [open ]);
  if (!open) return null;
  const filtered = cards.filter((c) => (c.project.name + c.project.description).toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 p-4" onClick={() => setOpen(false)}>
      <div className="mx-auto mt-24 max-w-lg rounded-2xl bg-white p-3 text-black dark:bg-[#15151f] dark:text-white" onClick={(e) => e.stopPropagation()}>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects, or type: inbox, onboarding, tracking" className="w-full rounded-xl border border-black/10 bg-transparent px-4 py-3 outline-none" />
        <div className="mt-2 flex flex-col">
          {filtered.map((c) => (
            <a key={c.project.id} href="/discover" className="rounded-xl px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10">
              <span className="font-semibold">{c.project.name}</span> <span className="opacity-60">· {Math.round(c.compatibility_score)}% · {c.project.languages.join(", ")}</span>
            </a>
          ))}
          {filtered.length === 0 && <div className="px-3 py-4 text-sm opacity-60">No matches — try a language like python or typescript.</div>}
        </div>
      </div>
    </div>
  );
}
