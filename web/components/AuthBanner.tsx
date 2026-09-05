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
    <div className="border-b border-black/10 bg-amber-100 px-4 py-2 text-center text-xs text-amber-900 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
      Local mode — no login needed. {data.needs_onboarding ? (<a className="underline" href="/onboarding">Finish onboarding →</a>) : (<span>{data.project_count} projects ready.</span>)}
    </div>
  );
}
