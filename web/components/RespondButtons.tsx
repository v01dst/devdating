"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function RespondButtons({ matchId, project }: { matchId: string; project: string }) {
  const queryClient = useQueryClient();
  const [resolved, setResolved] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (accept: boolean) => {
      const response = await fetch(`/backend/api/v1/matches/${matchId}/respond`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept }),
      });
      if (!response.ok) throw new Error(`Failed (${response.status})`);
      return response.json();
    },
    onSuccess: (_data, accept) => {
      setResolved(accept ? "accepted" : "declined");
      queryClient.invalidateQueries({ queryKey: ["incoming-matches"] });
    },
  });

  if (resolved) {
    return (
      <span className={`text-xs ${resolved === "accepted" ? "text-emerald-300" : "text-white/50"}`}>
        {resolved === "accepted" ? "✓ matched" : "declined"}
      </span>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate(true)}
        className="rounded-full bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/30 disabled:opacity-50"
      >
        Accept
      </button>
      <button
        type="button"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate(false)}
        className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/60 transition hover:bg-white/20 disabled:opacity-50"
      >
        Decline
      </button>
    </div>
  );
}