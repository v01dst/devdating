"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type SyncRun } from "@/lib/api";

const LABEL_GROUPS = [
  { id: "good-first", label: "Good first issues" },
  { id: "help-wanted", label: "Help wanted" },
  { id: "beginner", label: "Beginner" },
  { id: "bug", label: "Bugs" },
];

const DIFFICULTIES = [
  { id: "", label: "Any difficulty" },
  { id: "beginner", label: "Beginner" },
  { id: "mid", label: "Mid" },
  { id: "hard", label: "Hard" },
];

export function IndexButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(500);
  const [groups, setGroups] = useState<string[]>(["good-first", "help-wanted"]);
  const [difficulty, setDifficulty] = useState("");
  const [runId, setRunId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const latest = useQuery({
    queryKey: ["sync-run", runId],
    queryFn: () => (api as unknown as { syncLatest: () => Promise<SyncRun | null> }).syncLatest(),
    enabled: runId !== null,
    refetchInterval: (query) => (query.state.data?.state === "DONE" || query.state.data?.state === "FAILED" ? false : 2000),
  });
  const run = latest.data && latest.data.id === runId ? latest.data : null;

  const toggleGroup = (id: string) =>
    setGroups((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));

  const start = async () => {
    if (groups.length === 0) {
      setStartError("Pick at least one label filter.");
      return;
    }
    setStarting(true);
    setStartError(null);
    try {
      const created = await (
        api as unknown as {
          syncStart: (body: { target: number; label_groups: string[]; difficulty: string | null }) => Promise<SyncRun>;
        }
      ).syncStart({ target, label_groups: groups, difficulty: difficulty || null });
      setRunId(created.id);
    } catch {
      setStartError("Could not start indexing. Is the API running?");
    } finally {
      setStarting(false);
    }
  };

  const close = () => {
    setOpen(false);
    setRunId(null);
    queryClient.invalidateQueries({ queryKey: ["status"] });
    queryClient.invalidateQueries({ queryKey: ["picks"] });
    queryClient.invalidateQueries({ queryKey: ["discovery-cards"] });
  };

  const pct = run ? Math.min(100, Math.round((run.indexed / Math.max(run.target, 1)) * 100)) : 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={compact ? "btn-primary px-4 py-2 text-sm" : "btn-primary px-5 py-2.5 text-sm"}
      >
        ⬇ Index projects
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/50 p-4" onClick={close}>
          <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-zinc-900">Index projects from GitHub</h2>
            <p className="mt-1 text-sm text-zinc-500">Pulls beginner-friendly issues into your feed. Runs in the background.</p>
            {!run ? (
              <>
                <p className="mt-4 text-sm font-semibold text-zinc-700">Labels</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {LABEL_GROUPS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGroup(g.id)}
                      className={groups.includes(g.id) ? "rounded-full bg-accent px-4 py-2 text-sm font-bold text-white" : "rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100"}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-sm font-semibold text-zinc-700">Difficulty</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDifficulty(d.id)}
                      className={difficulty === d.id ? "rounded-full bg-zinc-900 px-4 py-2 text-sm font-bold text-white" : "rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100"}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <label className="mt-4 block text-sm font-semibold text-zinc-700">
                  Issues to index
                  <select value={target} onChange={(e) => setTarget(Number(e.target.value))} className="input mt-2">
                    <option value={200}>200 issues (quick)</option>
                    <option value={500}>500 issues (recommended)</option>
                    <option value={1000}>1000 issues (deep)</option>
                  </select>
                </label>
                {startError && <p className="mt-2 text-sm text-rose-600">{startError}</p>}
                <button type="button" onClick={start} disabled={starting} className="btn-primary mt-4 w-full px-4 py-3 text-sm disabled:opacity-50">
                  {starting ? "Starting…" : "Start indexing"}
                </button>
                <button
                  type="button"
                  onClick={() => { close(); window.dispatchEvent(new CustomEvent("devdating:open-token")); }}
                  className="mt-3 w-full text-center text-xs text-zinc-500 hover:text-zinc-900"
                >
                  Tip: connect a GitHub token for ~10× faster indexing →
                </button>
              </>
            ) : (
              <>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-zinc-700">
                      {run.state === "DONE" ? "Done" : run.state === "FAILED" ? "Failed" : run.state === "RUNNING" ? "Indexing…" : "Queued…"}
                    </span>
                    <span className="text-zinc-500">{run.indexed} / {run.target}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                    {run.state === "DONE" || run.state === "FAILED" ? (
                      <div className={`h-full rounded-full transition-all ${run.state === "DONE" ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: "100%" }} />
                    ) : (
                      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.max(pct, 4)}%` }} />
                    )}
                  </div>
                </div>
                {run.state === "DONE" && <p className="mt-2 text-sm text-emerald-600">+{run.indexed} issues indexed. Fresh picks incoming.</p>}
                {run.state === "FAILED" && <p className="mt-2 text-sm text-rose-600">{run.error || "Indexing failed (GitHub rate limit?). Try again later."}</p>}
                {(run.state === "DONE" || run.state === "FAILED") && (
                  <button type="button" onClick={close} className="btn-primary mt-4 w-full px-4 py-3 text-sm">
                    Done
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
