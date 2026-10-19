import { PreferencesForm } from "@/components/PreferencesForm";
import { apiFetch } from "@/lib/server-api";

export const metadata = { title: "Profile — DevDating" };

export default async function ProfilePage() {
  const user = await apiFetch<any>("/api/v1/me");
  if (!user) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-12">
        <div className="card mt-10 rounded-3xl p-8 text-ink-soft">
          Could not load your profile. Is the API running?
        </div>
      </main>
    );
  }
  const dashboard = (await apiFetch<any>("/api/v1/me/dashboard")) ?? {};
  const { stats = {}, readiness = {}, paths = {} } = dashboard;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <header className="mt-8 flex items-center gap-5">
        {user.avatar_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar_url} alt="" className="size-20 rounded-3xl border border-line" />
        )}
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">{user.name || user.github_login}</h1>
          <p className="text-ink-dim">@{user.github_login}</p>
          <span className="mt-2 inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent-soft">
            {user.experience_level}
          </span>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Swipes", stats.swipes ?? 0],
          ["Likes", stats.likes ?? 0],
          ["Matches", stats.matches ?? 0],
          ["Readiness", `${readiness.readiness_score ?? 0}/100`],
        ].map(([label, value]) => (
          <div key={label} className="card rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-like">{value}</div>
            <div className="mt-1 text-xs uppercase tracking-wide text-ink-dim">{label}</div>
          </div>
        ))}
      </div>

      <section className="card mt-6 rounded-3xl p-6">
        <h2 className="font-semibold text-ink">Tech stack</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(user.tech_stack?.length ? user.tech_stack : ["none yet"]).map((lang: string) => (
            <span key={lang} className="chip">{lang}</span>
          ))}
        </div>
        {user.domains?.length > 0 && (
          <>
            <h2 className="mt-5 font-semibold text-ink">Domains</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {user.domains.map((domain: string) => (
                <span key={domain} className="rounded-full bg-ghost px-3 py-1 text-sm text-ink-soft">{domain}</span>
              ))}
            </div>
          </>
        )}
      </section>

      <PreferencesForm
        initial={{
          tech_stack: (user.tech_stack ?? []).join(", "),
          experience_level: user.experience_level,
          availability: user.availability?.level ?? "",
        }}
      />

      {readiness.advice?.length > 0 && (
        <section className="card mt-6 rounded-3xl p-6">
          <h2 className="font-semibold text-ink">Contribution readiness</h2>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-ghost">
            <div className="h-full rounded-full bg-accent" style={{ width: `${readiness.readiness_score ?? 0}%` }} />
          </div>
          <ul className="mt-4 space-y-1 text-sm text-ink-soft">
            {readiness.advice.map((tip: string) => (
              <li key={tip}>✦ {tip}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-dim">
            {readiness.language_matched ?? 0} language-matched · {readiness.unassigned_easy ?? 0} unassigned easy issues indexed
          </p>
        </section>
      )}

      {paths.paths?.length > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold text-ink">Learning paths</h2>
          {paths.recommended_first_step && (
            <p className="mt-1 text-sm text-accent-soft">Start here: {paths.recommended_first_step}</p>
          )}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {paths.paths.map((path: any) => (
              <div key={path.id} className="card rounded-3xl p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-ink">{path.title}</h3>
                  <span className="rounded-full bg-ghost px-2 py-1 text-xs text-ink-dim">~{path.estimated_days}d</span>
                </div>
                <p className="mt-2 text-sm text-ink-dim">{path.outcome}</p>
                <ol className="mt-3 space-y-1 text-sm text-ink-soft">
                  {path.steps.map((step: string, index: number) => (
                    <li key={step}>{index + 1}. {step}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
