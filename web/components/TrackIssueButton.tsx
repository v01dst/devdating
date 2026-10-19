"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";

type Props = {
  repo: string;
  issueNumber: number;
  issueId?: string;
  /** Pre-mark items already present in the tracking list (server-rendered pages). */
  initiallyTracked?: boolean;
  /** Where the "tracking" confirmation should link; renders plain text when omitted
   * (e.g. inside an anchor card, where nested links are invalid). */
  trackedHref?: string;
  variant?: "primary" | "ghost";
};

/**
 * Starts tracking a GitHub issue as a contribution. The claim endpoint is
 * idempotent, so double clicks are harmless; GitHub sync advances the state
 * afterwards (CLAIMED → PR_OPEN → MERGED).
 */
export function TrackIssueButton({
  repo,
  issueNumber,
  issueId,
  initiallyTracked = false,
  trackedHref,
  variant = "primary",
}: Props) {
  const [tracked, setTracked] = useState(initiallyTracked);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  async function startTracking() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.claim(repo, issueNumber, issueId);
      setTracked(true);
      void queryClient.invalidateQueries({ queryKey: ["contributions"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start tracking");
    } finally {
      setBusy(false);
    }
  }

  if (tracked) {
    const label = "✓ Tracking";
    const classes =
      variant === "primary"
        ? "inline-flex items-center gap-2 rounded-full bg-like/15 px-4 py-2 text-sm font-semibold text-like"
        : "inline-flex items-center gap-1 text-xs font-semibold text-like";
    return trackedHref ? (
      <Link href={trackedHref} className={classes}>
        {label} — view contributions
      </Link>
    ) : (
      <span className={classes}>{label}</span>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={(event) => {
          // Cards wrap this button in an anchor; don't navigate the card.
          event.preventDefault();
          event.stopPropagation();
          void startTracking();
        }}
        className={
          variant === "primary"
            ? "btn-primary px-4 py-2 text-sm transition disabled:opacity-50"
            : "inline-flex items-center gap-1 text-xs font-semibold text-accent-soft hover:underline disabled:opacity-50"
        }
      >
        {busy ? "Starting…" : "+ Track this issue"}
      </button>
      {error && <span className="text-xs text-heart">{error}</span>}
    </span>
  );
}
