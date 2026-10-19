"use client";
import { useState } from "react";
import { api } from "@/lib/api";

const LANGS = ["TypeScript", "Python", "Go", "Rust", "Java", "Kotlin", "Swift", "C++", "Ruby", "Dart"];

export function OnboardingWizard() {
  const [langs, setLangs] = useState<string[]>(["TypeScript"]);
  const [level, setLevel] = useState("INTERMEDIATE");
  const [done, setDone] = useState(false);
  const toggle = (l: string) => setLangs((v) => (v.includes(l) ? v.filter((x) => x !== l) : [...v, l]));
  const save = async () => {
    await (api as unknown as { onboarding: (p: object) => Promise<unknown> }).onboarding({ tech_stack: langs, experience_level: level });
    setDone(true);
    window.location.href = "/discover";
  };
  if (done) return <div className="text-ink-soft">Saved, taking you to Discover…</div>;
  return (
    <div className="card mx-auto max-w-xl p-6">
      <h1 className="text-3xl font-bold text-ink">Get your picks in 30 seconds</h1>
      <p className="text-ink-soft">Step 1/2: pick languages. Step 2/2: pick level.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {LANGS.map((l) => (
          <button key={l} onClick={() => toggle(l)} className={langs.includes(l) ? "rounded-full bg-accent px-4 py-2 text-sm font-bold text-white" : "rounded-full border border-line bg-raised px-4 py-2 text-sm text-ink-soft"}>{l}</button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {["NEWCOMER", "BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"].map((lv) => (
          <button key={lv} onClick={() => setLevel(lv)} className={level === lv ? "rounded-xl bg-ink px-3 py-2 text-xs font-bold text-ink-strong" : "rounded-xl border border-line bg-raised px-3 py-2 text-xs text-ink-soft"}>{lv}</button>
        ))}
      </div>
      <button onClick={save} className="btn-primary mt-6 w-full py-3 font-bold">Show my picks →</button>
    </div>
  );
}
