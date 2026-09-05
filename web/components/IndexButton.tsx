"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function IndexButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(500);
  const [runId, setRunId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const latest = useQuery({
    queryKey: ["sync-run", runId],
    queryFn: () => (api as unknown as { syncLatest: () => Promise<import("@/lib/api").SyncRun | null> }).syncLatest(),
    enabled: runId !== null,
    refetchInterval: (query) => (query.state.data?.state === "DONE" || query.state.data?.state === "FAILED" ? false : 2000),
  });
  const run = latest.data && latest.data.id === runId ? latest.data : null;

  const start = async () => {
    setStarting(true);
    setStartError(null);
    try {
      const created = await (api as unknown as { syncStart: (t: number) => Promise<import("@/lib/api").SyncRun> }).syncStart(target);
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
          <div className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-zinc-900">Index projects from GitHub</h2>
            <p className="mt-1 text-sm text-zinc-500">Pulls beginner-friendly issues into your feed. Runs in the background.</p>
            {!run ? (
              <>
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
                      <div className={`h-full rounded-full ${run.state === "DONE" ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: "100%" }} />
                    ) : (
                      <div className="skeleton h-full w-full rounded-full" />
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
