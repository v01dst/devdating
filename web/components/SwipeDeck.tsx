"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api, type DiscoveryCard } from "@/lib/api";
import { MatchModal } from "@/components/MatchModal";
import { SkeletonCard } from "@/components/PageShell";

type SwipeDirection = "LIKE" | "PASS" | "SUPER_LIKE";

function ActivityHeatmap({ score }: { score: number }) {
  return (
    <div aria-label={`Project activity ${Math.round(score)} out of 100`}>
      <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
        <span>Vibe score</span>
        <span>{Math.round(score)}/100</span>
      </div>
      <div className="grid grid-cols-12 gap-1">
        {Array.from({ length: 24 }).map((_, index) => (
          <span
            key={index}
            className="h-2 rounded-sm bg-accent"
            style={{ opacity: Math.max(0.12, Math.min(1, (score / 100 + index % 6 * 0.03))) }}
          />
        ))}
      </div>
    </div>
  );
}

function ProjectCard({ card, onSwipe }: { card: DiscoveryCard; onSwipe: (direction: SwipeDirection) => void }) {
  const project = card.project;
  return (
    <motion.article
      drag
      dragElastic={0.16}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.x > 110) onSwipe("LIKE");
        if (info.offset.x < -110) onSwipe("PASS");
      }}
      initial={{ opacity: 0, scale: 0.94, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, x: 180, rotate: 12 }}
      whileDrag={{ cursor: "grabbing" }}
      className="card absolute inset-x-0 bottom-24 mx-auto flex max-w-md flex-col rounded-[28px] p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-[#5b3df0]">{project.owner_login}</p>
          <h2 className="mt-1 text-2xl font-semibold leading-tight text-zinc-900">{project.name}</h2>
        </div>
        <div className="rounded-2xl bg-violet-100 px-3 py-2 text-center">
          <div className="text-lg font-bold text-[#5b3df0]">{Math.round(card.compatibility_score)}</div>
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">match</div>
        </div>
      </div>
      <p className="mt-4 line-clamp-4 min-h-20 text-sm text-zinc-600">{project.description ?? "No description provided."}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {project.languages.slice(0, 4).map((language) => (
          <span key={language} className="chip">{language}</span>
        ))}
        {project.topics.slice(0, 2).map((topic) => (
          <span key={topic} className="chip-accent">#{topic}</span>
        ))}
      </div>
      <div className="mt-6"><ActivityHeatmap score={project.activity_score} /></div>
      <ul className="mt-5 space-y-2 text-sm text-zinc-600">
        {card.reasons.slice(0, 2).map((reason) => (
          <li key={reason} className="flex gap-2"><span className="text-[#0284c7]">✦</span>{reason}</li>
        ))}
      </ul>
    </motion.article>
  );
}

export function SwipeDeck() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{ card: DiscoveryCard; matchId: string } | null>(null);
  const cardsQuery = useQuery({ queryKey: ["discovery-cards"], queryFn: api.cards });

  const swipeMutation = useMutation({
    mutationFn: ({ projectId, direction }: { projectId: string; direction: SwipeDirection }) =>
      api.swipe(projectId, direction),
    onSuccess: (result, variables) => {
      queryClient.setQueryData<DiscoveryCard[]>(["discovery-cards"], (old) =>
        old ? old.filter((card) => card.project.id !== variables.projectId) : old,
      );
      if (!result.match_created) {
        setFeedback(variables.direction === "SUPER_LIKE" ? "Super-liked! They'll see you first." : "Preference saved");
      }
    },
    onError: () => setFeedback("Could not save that swipe"),
  });

  const undoMutation = useMutation({
    mutationFn: () => api.undo(),
    onSuccess: (result) => {
      if (result.undone) {
        queryClient.invalidateQueries({ queryKey: ["discovery-cards"] });
        setFeedback(result.removed_match ? "Swipe undone — pending match withdrawn." : "Swipe undone.");
      } else {
        setFeedback("Nothing to undo yet.");
      }
    },
    onError: () => setFeedback("Could not undo that swipe"),
  });

  const cards = cardsQuery.data ?? [];
  const currentCard = cards[0];

  const doSwipe = (direction: SwipeDirection) => {
    const card = currentCard;
    if (!card || swipeMutation.isPending) return;
    swipeMutation.mutate(
      { projectId: card.project.id, direction },
      {
        onSuccess: (result) => {
          if (result.match_created && result.match_id) {
            setCelebration({ card, matchId: result.match_id });
          }
        },
      },
    );
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      if (document.querySelector("[data-palette-open='true']")) return;
      if (e.key === "ArrowLeft") doSwipe("PASS");
      else if (e.key === "ArrowRight") doSwipe("LIKE");
      else if (e.key === "ArrowUp") {
        e.preventDefault();
        doSwipe("SUPER_LIKE");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCard?.project.id, swipeMutation.isPending]);

  if (cardsQuery.isLoading) {
    return (
      <div className="mx-auto mt-10 max-w-md">
        <SkeletonCard />
        <p className="mt-4 text-center text-sm text-zinc-500">Finding projects you&apos;ll love…</p>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="card mt-24 mx-auto max-w-md rounded-3xl p-8 text-center">
        <h2 className="text-xl font-semibold text-zinc-900">No more projects</h2>
        <p className="mt-3 text-zinc-500">Adjust preferences or refresh to discover a broader set.</p>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence mode="popLayout" initial={false}>
        <ProjectCard
          key={currentCard.project.id}
          card={currentCard}
          onSwipe={(direction) => doSwipe(direction)}
        />
      </AnimatePresence>
      <div className="absolute inset-x-0 bottom-8 flex items-center justify-center gap-4">
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => undoMutation.mutate()}
          className="grid size-12 place-items-center rounded-full border border-zinc-200 bg-white text-xl text-zinc-500 transition hover:bg-zinc-100"
          aria-label="Undo last swipe"
          title="Undo (take back your last swipe)"
        >
          ↩
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => doSwipe("PASS")}
          className="grid size-16 place-items-center rounded-full border border-rose-200 bg-rose-50 text-2xl text-rose-600 transition hover:bg-rose-100"
          aria-label="Pass (←)"
        >
          ✕
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => doSwipe("SUPER_LIKE")}
          className="grid size-12 place-items-center rounded-full border border-violet-200 bg-violet-100 text-xl text-[#5b3df0] transition hover:bg-violet-200"
          aria-label="Super like (↑)"
          title="Super like — they see you first"
        >
          ⭐
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => doSwipe("LIKE")}
          className="grid size-16 place-items-center rounded-full border border-emerald-200 bg-emerald-50 text-2xl text-emerald-600 transition hover:bg-emerald-100"
          aria-label="Like (→)"
        >
          ♥
        </motion.button>
      </div>
      <p className="absolute inset-x-0 -bottom-2 text-center text-xs text-zinc-400">← pass · → like · ↑ super-like · drag works too</p>
      {feedback && <output className="absolute inset-x-0 top-6 text-center text-sm text-zinc-500">{feedback}</output>}
      {celebration && (
        <MatchModal card={celebration.card} matchId={celebration.matchId} onClose={() => setCelebration(null)} />
      )}
    </>
  );
}
