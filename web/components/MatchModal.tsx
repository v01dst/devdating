"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, type DiscoveryCard } from "@/lib/api";

const BURSTS = [
  { x: -90, y: -70, c: "#7c5cff", d: 0 },
  { x: 90, y: -60, c: "#22c55e", d: 0.05 },
  { x: -70, y: 60, c: "#f59e0b", d: 0.1 },
  { x: 80, y: 70, c: "#0284c7", d: 0.15 },
  { x: 0, y: -100, c: "#e11d48", d: 0.2 },
];

export function MatchModal({ card, matchId, onClose }: { card: DiscoveryCard; matchId: string; onClose: () => void }) {
  const rec = useQuery({ queryKey: ["issue-rec", matchId], queryFn: () => api.issueRec(matchId) });
  const issue = rec.data && rec.data.status !== "PENDING" ? rec.data : null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {BURSTS.map((b, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            animate={{ opacity: 0, x: b.x, y: b.y, scale: 0.4 }}
            transition={{ duration: 0.9, delay: 0.15 + b.d, ease: "easeOut" }}
            className="pointer-events-none absolute left-1/2 top-24 size-3 rounded-full"
            style={{ background: b.c }}
          />
        ))}
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
          className="mx-auto grid size-20 place-items-center rounded-full bg-violet-100 text-4xl"
        >
          💜
        </motion.div>
        <h2 className="mt-4 text-3xl font-bold text-zinc-900">It&apos;s a match!</h2>
        <p className="mt-1 text-zinc-600">
          {card.project.owner_login}/{card.project.name} ·{" "}
          <span className="font-bold text-[#5b3df0]">{Math.round(card.compatibility_score)}%</span>
        </p>
        <div className="card mt-5 p-4 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Starter issue</p>
          {issue ? (
            <a href={issue.url} target="_blank" rel="noreferrer" className="mt-1 block font-semibold text-zinc-900 hover:text-[#5b3df0]">
              {issue.title}
            </a>
          ) : (
            <div className="skeleton mt-2 h-5 w-full rounded-lg" />
          )}
          {issue?.rationale && <p className="mt-1 text-sm text-zinc-500">{issue.rationale}</p>}
        </div>
        <div className="mt-6 flex gap-2">
          <Link href="/matches" className="btn-primary flex-1 px-4 py-3 text-center text-sm">
            View match
          </Link>
          <button type="button" onClick={onClose} className="flex-1 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100">
            Keep swiping
          </button>
        </div>
      </motion.div>
    </div>
  );
}
