"use client";
import { useQuery } from "@tanstack/react-query";

export function AuthBanner() {
  const { data } = useQuery({
    queryKey: ["status"],
    queryFn: async () => {
      const r = await fetch("/backend/api/v1/status", { credentials: "same-origin" });
      if (!r.ok) return null;
      return r.json() as Promise<{ needs_onboarding: boolean; project_count: number }>;
    },
  });
  if (!data) return null;
  return (
    <div className="border-b border-accent/25 bg-accent/10 px-4 py-2 text-center font-mono text-[11px] tracking-wide text-ink-soft">
      Local mode, no login needed. {data.needs_onboarding ? (<a className="text-accent-soft underline decoration-dotted underline-offset-2 transition hover:text-ink" href="/onboarding">finish onboarding →</a>) : (<span>{data.project_count} projects ready.</span>)}
    </div>
  );
}
