import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="relative isolate overflow-hidden px-6 pb-24 pt-16 sm:px-10">
      <div aria-hidden className="absolute -right-24 -top-24 size-72 rounded-full bg-accent/25 blur-3xl" />
      <div aria-hidden className="absolute -left-20 bottom-10 size-64 rounded-full bg-signal/10 blur-3xl" />
      <section className="mx-auto max-w-6xl">
        <nav className="flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">Dev<span className="text-accent-soft">Dating</span></span>
          <a href="/discover" className="rounded-full border border-white/15 px-4 py-2 text-sm transition hover:bg-white/10">Open app</a>
        </nav>
        <div className="mt-20 max-w-3xl">
          <p className="inline-flex rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-xs font-medium text-accent-soft">
            Open-source matchmaking
          </p>
          <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
            Find a repository you’ll actually contribute to.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/65">
            DevDating turns contributor discovery into two-way matching. Projects compete for the right people—not just more people.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/discover" className="rounded-full bg-accent px-7 py-3 font-medium transition hover:bg-accent-soft">Start swiping</Link>
            <a href="#how" className="rounded-full border border-white/15 px-7 py-3 font-medium transition hover:bg-white/10">How matching works</a>
          </div>
        </div>
        <dl id="how" className="mt-24 grid gap-5 sm:grid-cols-3">
          {[
            ["Skill-aware profiles", "GitHub signals plus editable preferences create an explainable contributor profile."],
            ["Two-way matches", "Weighted scoring respects maintainer capacity and project difficulty."],
            ["Actionable first step", "Each match recommends a specific good-first issue, not just another repository."],
          ].map(([title, copy]) => (
            <div key={title} className="glass-card rounded-3xl p-6">
              <dt className="font-semibold">{title}</dt>
              <dd className="mt-2 text-sm leading-6 text-white/65">{copy}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
