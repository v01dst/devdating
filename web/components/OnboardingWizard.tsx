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
  if (done) return <div>Saved — taking you to Discover…</div>;
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-bold">Get your picks in 30 seconds</h1>
      <p className="opacity-70">Step 1/2 — pick languages. Step 2/2 — pick level.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {LANGS.map((l) => (
          <button key={l} onClick={() => toggle(l)} className={langs.includes(l) ? "rounded-full bg-[#7c5cff] px-4 py-2 text-sm font-bold text-white" : "rounded-full border border-black/15 px-4 py-2 text-sm dark:border-white/15"}>{l}</button>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        {["NEWCOMER", "BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"].map((lv) => (
          <button key={lv} onClick={() => setLevel(lv)} className={level === lv ? "rounded-xl bg-black px-3 py-2 text-xs font-bold text-white dark:bg-white dark:text-black" : "rounded-xl border border-black/15 px-3 py-2 text-xs dark:border-white/15"}>{lv}</button>
        ))}
      </div>
      <button onClick={save} className="mt-6 w-full rounded-2xl bg-[#7c5cff] py-3 font-bold text-white">Show my picks →</button>
    </div>
  );
}
