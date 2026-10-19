"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

export function ClaimButton({ projectId }: { projectId: string }) {
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/backend/api/v1/projects/${projectId}/claim`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error(`Claim failed (${response.status})`);
      return response.json();
    },
    onSuccess: () => setClaimed(true),
    onError: () => setError(true),
  });

  if (claimed) {
    return <span className="text-xs text-like">✓ claimed — see Maintainer hub</span>;
  }
  if (error) {
    return <span className="text-xs text-ink-dim">already claimed or unavailable</span>;
  }
  return (
    <button
      type="button"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className="rounded-full bg-ghost px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-ink/15 disabled:opacity-50"
    >
      {mutation.isPending ? "Claiming…" : "Claim as maintainer"}
    </button>
  );
}
