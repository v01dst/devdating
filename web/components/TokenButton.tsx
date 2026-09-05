"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type TokenStatus = { configured: boolean; login: string; rate_limit: number; rate_remaining: number };

async function tokenStatus(): Promise<TokenStatus> {
  const r = await fetch("/backend/api/v1/settings/github-token", { credentials: "same-origin" });
  if (!r.ok) throw new Error(`status ${r.status}`);
  return r.json();
}

export function TokenButton() {
  const [open, setOpen] = useState(false);
  const { data } = useQuery({ queryKey: ["token-status"], queryFn: tokenStatus });
  useEffect(() => {
    const opener = () => setOpen(true);
    window.addEventListener("devdating:open-token", opener);
    return () => window.removeEventListener("devdating:open-token", opener);
  }, []);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={data?.configured ? `GitHub connected${data.login ? ` as ${data.login}` : ""}` : "Connect a GitHub token for faster indexing"}
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-600 transition hover:text-zinc-900"
      >
        <span className={`size-2 rounded-full ${data?.configured ? "bg-emerald-500" : "bg-zinc-300"}`} />
        <span className="hidden sm:inline">{data?.configured ? "GitHub ✓" : "Connect GitHub"}</span>
      </button>
      {open && <TokenModal onClose={() => setOpen(false)} />}
    </>
  );
}

function TokenModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data, refetch } = useQuery({ queryKey: ["token-status"], queryFn: tokenStatus });
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!value.trim()) {
      setError("Paste a token first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/backend/api/v1/settings/github-token", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: value.trim() }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.detail || `Save failed (${r.status})`);
      setValue("");
      setSaved(true);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["token-status"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await fetch("/backend/api/v1/settings/github-token", { method: "DELETE", credentials: "same-origin" });
      setSaved(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["token-status"] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-zinc-900">GitHub token</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Speeds indexing ~10× (5,000 requests/hour instead of 60). Create one at{" "}
          <span className="font-mono">github.com → Settings → Developer settings → Personal access tokens</span> — no
          scopes needed for public data.
        </p>
        {data?.configured ? (
          <div className="card mt-4 p-4">
            <p className="text-sm text-zinc-700">
              <span className="mr-2 inline-block size-2 rounded-full bg-emerald-500" />
              Connected{data.login ? ` as ` : ""}{data.login && <span className="font-bold">{data.login}</span>}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Stored only on this machine, never shown again.</p>
            <button type="button" onClick={remove} disabled={busy} className="mt-3 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 disabled:opacity-50">
              Remove token
            </button>
          </div>
        ) : (
          <>
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="ghp_••••••••••••"
              className="input mt-4 font-mono"
            />
            {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
            {saved && <p className="mt-2 text-sm text-emerald-600">Saved and verified.</p>}
            <button type="button" onClick={save} disabled={busy} className="btn-primary mt-3 w-full px-4 py-3 text-sm disabled:opacity-50">
              {busy ? "Verifying with GitHub…" : "Save token"}
            </button>
          </>
        )}
        <button type="button" onClick={onClose} className="mt-3 w-full text-center text-sm text-zinc-500 hover:text-zinc-900">
          Close
        </button>
      </div>
    </div>
  );
}

export function openTokenModal() {
  window.dispatchEvent(new CustomEvent("devdating:open-token"));
}
