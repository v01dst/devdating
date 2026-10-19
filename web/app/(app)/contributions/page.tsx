"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, type Contribution, type ContributionSyncResult } from "@/lib/api";
import { timeAgo } from "@/lib/timeAgo";

const LIFECYCLE = ["INTERESTED", "CLAIMED", "PR_OPEN", "MERGED"] as const;

const STATE_META: Record<string, { label: string; chip: string }> = {
  INTERESTED: { label: "Interested", chip: "bg-ghost text-ink-soft" },
  CLAIMED: { label: "Claimed", chip: "bg-warn/15 text-warn" },
  PR_OPEN: { label: "PR open", chip: "bg-signal/15 text-signal" },
  MERGED: { label: "Merged", chip: "bg-like/15 text-like" },
};

function stateMeta(state: string) {
  return STATE_META[state] ?? STATE_META.INTERESTED;
}

function issueUrl(contribution: Contribution) {
  if (!contribution.repo || !contribution.issue_number) return null;
  return `https://github.com/${contribution.repo}/issues/${contribution.issue_number}`;
}

function LifecycleStepper({ state }: { state: string }) {
  const activeIndex = LIFECYCLE.indexOf(state as (typeof LIFECYCLE)[number]);
  return (
    <div className="flex items-center" aria-hidden>
      {LIFECYCLE.map((step, index) => (
        <div key={step} className="flex items-center">
          <span
            className={`size-2.5 rounded-full transition ${
              index <= activeIndex ? "bg-accent" : "bg-ink/10"
            }`}
          />
          {index < LIFECYCLE.length - 1 && (
            <span className={`h-0.5 w-7 ${index < activeIndex ? "bg-accent" : "bg-ink/10"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function ContributionRow({
  contribution,
  onChanged,
}: {
  contribution: Contribution;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState(contribution.state);
  const [prUrl, setPrUrl] = useState(contribution.pr_url ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = stateMeta(contribution.state);
  const githubIssue = issueUrl(contribution);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api.updateContribution(contribution.id, { state, pr_url: prUrl.trim() || null });
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card rounded-3xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-mono text-sm font-semibold text-ink">
              {contribution.repo}
              {contribution.issue_number > 0 ? `#${contribution.issue_number}` : ""}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.chip}`}>
              {meta.label}
            </span>
          </div>
          <div className="mt-3">
            <LifecycleStepper state={contribution.state} />
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {githubIssue && (
            <a href={githubIssue} target="_blank" rel="noreferrer" className="font-medium text-ink-dim hover:text-ink">
              Issue ↗
            </a>
          )}
          {contribution.pr_url && (
            <a href={contribution.pr_url} target="_blank" rel="noreferrer" className="font-medium text-accent-soft hover:underline">
              {contribution.state === "MERGED" ? "Merged PR ↗" : "Pull request ↗"}
            </a>
          )}
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink-soft transition hover:border-ink/30"
          >
            {editing ? "Close" : "Update"}
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-4 grid gap-3 border-t border-line-soft pt-4 sm:grid-cols-[180px_1fr_auto]">
          <select value={state} onChange={(event) => setState(event.target.value)} className="input">
            {LIFECYCLE.map((step) => (
              <option key={step} value={step}>
                {stateMeta(step).label}
              </option>
            ))}
          </select>
          <input
            value={prUrl}
            onChange={(event) => setPrUrl(event.target.value)}
            placeholder="https://github.com/…/pull/123 (optional)"
            className="input"
          />
          <button type="button" onClick={() => void save()} disabled={busy} className="btn-primary px-5 transition disabled:opacity-50">
            {busy ? "Saving…" : "Save"}
          </button>
          {error && <p className="text-xs text-heart sm:col-span-3">{error}</p>}
        </div>
      )}

      <p className="mt-3 text-xs text-ink-dim">
        {contribution.last_synced_at
          ? `GitHub checked ${timeAgo(contribution.last_synced_at)}`
          : "Not checked against GitHub yet"}
        {" · "}
        added {timeAgo(contribution.created_at)}
      </p>
    </div>
  );
}

export default function ContributionsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"active" | "merged" | "all">("active");
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<ContributionSyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["contributions"], queryFn: api.contributions });
  const contributions = useMemo(() => data ?? [], [data]);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["contributions"] });
  }

  async function sync(force: boolean) {
    setSyncing(true);
    setSyncError(null);
    try {
      const result = await api.syncContributions(force);
      setLastSync(result);
      refresh();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  // Best-effort refresh when the page opens; the API skips repos checked in the
  // last few minutes, so this stays cheap on repeat visits.
  useEffect(() => {
    let cancelled = false;
    api
      .syncContributions(false)
      .then((result) => {
        if (cancelled) return;
        setLastSync(result);
        refresh();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const merged = contributions.filter((item) => item.state === "MERGED");
  const active = contributions.filter((item) => item.state !== "MERGED");
  const visible = filter === "active" ? active : filter === "merged" ? merged : contributions;

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-ink">Contribution tracking</h1>
          <p className="mt-2 max-w-xl text-ink-soft">
            From “I’m interested” to merged. Link your PR on GitHub and the state advances itself:
            interested → claimed → PR open → merged.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void sync(true)}
          disabled={syncing}
          className="btn-primary px-5 py-3 text-sm transition disabled:opacity-50"
        >
          {syncing ? "Checking GitHub…" : "Sync from GitHub"}
        </button>
      </div>

      {(lastSync || syncError) && (
        <div className="mt-5 rounded-2xl border border-line bg-raised px-4 py-3 text-sm text-ink-soft">
          {syncError ? (
            <span className="text-heart">{syncError}</span>
          ) : lastSync ? (
            <span>
              Checked {lastSync.repos_checked} repo{lastSync.repos_checked === 1 ? "" : "s"} ·{" "}
              {lastSync.updated.length} update{lastSync.updated.length === 1 ? "" : "s"}
              {lastSync.skipped_recent > 0 && ` · ${lastSync.skipped_recent} recently checked`}
              {lastSync.errors.length > 0 && (
                <span className="text-warn">
                  {" "}
                  · issues: {lastSync.errors.map((item) => `${item.repo} (${item.error})`).join(", ")}
                </span>
              )}
            </span>
          ) : null}
        </div>
      )}

      <div className="mt-6 flex gap-2">
        {(
          [
            ["active", `Active (${active.length})`],
            ["merged", `Merged (${merged.length})`],
            ["all", `All (${contributions.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filter === key ? "bg-accent text-white" : "bg-raised text-ink-soft hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {isLoading && (
          <>
            <div className="skeleton h-28 rounded-3xl" />
            <div className="skeleton h-28 rounded-3xl" />
          </>
        )}

        {!isLoading && visible.length === 0 && (
          <div className="card rounded-3xl p-10 text-center">
            <p className="text-3xl text-accent-soft" aria-hidden>✦</p>
            <h2 className="mt-3 font-semibold text-ink">
              {filter === "merged" ? "Nothing merged yet" : "No contributions tracked yet"}
            </h2>
            <p className="mt-1 text-sm text-ink-dim">
              Open a <Link href="/matches" className="font-semibold text-accent-soft hover:underline">match</Link> or
              the <Link href="/issues" className="font-semibold text-accent-soft hover:underline">issue feed</Link> and
              hit “Track this issue”.
            </p>
          </div>
        )}

        {visible.map((contribution) => (
          <ContributionRow key={contribution.id} contribution={contribution} onChanged={refresh} />
        ))}
      </div>
    </main>
  );
}
