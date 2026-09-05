"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, type DiscoveryCard } from "@/lib/api";

type SwipeDirection = "LIKE" | "PASS";

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
  const cardsQuery = useQuery({ queryKey: ["discovery-cards"], queryFn: api.cards });

  const swipeMutation = useMutation({
    mutationFn: ({ projectId, direction }: { projectId: string; direction: SwipeDirection }) =>
      api.swipe(projectId, direction),
    onSuccess: (result, variables) => {
      queryClient.setQueryData<DiscoveryCard[]>(["discovery-cards"], (old) =>
        old ? old.filter((card) => card.project.id !== variables.projectId) : old,
      );
      setFeedback(result.match_created ? `Match created! Score ${result.compatibility_score}` : "Preference saved");
    },
    onError: () => setFeedback("Could not save that swipe"),
  });

  const cards = cardsQuery.data ?? [];
  const currentCard = cards[0];

  if (cardsQuery.isLoading) {
    return <div className="mt-32 text-center text-zinc-500">Loading your matches…</div>;
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
          onSwipe={(direction) => swipeMutation.mutate({ projectId: currentCard.project.id, direction })}
        />
      </AnimatePresence>
      <div className="absolute inset-x-0 bottom-8 flex justify-center gap-6">
        <button
          type="button"
          onClick={() => swipeMutation.mutate({ projectId: currentCard.project.id, direction: "PASS" })}
          className="grid size-16 place-items-center rounded-full border border-rose-200 bg-rose-50 text-2xl text-rose-600 transition hover:bg-rose-100"
          aria-label="Pass"
        >
          ✕
        </button>
        <button
          type="button"
          onClick={() => swipeMutation.mutate({ projectId: currentCard.project.id, direction: "LIKE" })}
          className="grid size-16 place-items-center rounded-full border border-emerald-200 bg-emerald-50 text-2xl text-emerald-600 transition hover:bg-emerald-100"
          aria-label="Like"
        >
          ♥
        </button>
      </div>
      {feedback && <output className="absolute inset-x-0 top-6 text-center text-sm text-zinc-500">{feedback}</output>}
    </>
  );
}
