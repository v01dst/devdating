"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Initial = { tech_stack: string; experience_level: string; availability: string };

const LEVELS = ["NEWCOMER", "BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];
const AVAILABILITY = [
  ["", "Any"],
  ["casual", "Casual"],
  ["part_time", "Part time"],
  ["regular", "Regular"],
  ["intense", "Intense"],
];

export function PreferencesForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [techStack, setTechStack] = useState(initial.tech_stack);
  const [level, setLevel] = useState(initial.experience_level);
  const [availability, setAvailability] = useState(initial.availability);
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/backend/api/v1/me/preferences", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tech_stack: techStack.split(",").map((item) => item.trim()).filter(Boolean),
          experience_level: level,
          ...(availability ? { availability } : {}),
        }),
      });
      if (!response.ok) throw new Error(`Save failed (${response.status})`);
      return response.json();
    },
    onSuccess: () => {
      setSaved(true);
      router.refresh();
    },
    onError: () => setSaved(false),
  });

  return (
    <form
      className="glass-card mt-6 rounded-3xl p-6"
      onSubmit={(event) => {
        event.preventDefault();
        setSaved(false);
        mutation.mutate();
      }}
    >
      <h2 className="font-semibold">Preferences</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="text-sm text-white/60">
          Tech stack (comma separated)
          <input
            value={techStack}
            onChange={(event) => setTechStack(event.target.value)}
            placeholder="python, typescript"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-accent"
          />
        </label>
        <label className="text-sm text-white/60">
          Experience level
          <select
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
          >
            {LEVELS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-white/60">
          Availability
          <select
            value={availability}
            onChange={(event) => setAvailability(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
          >
            {AVAILABILITY.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-2xl bg-accent px-5 py-2.5 font-medium transition hover:bg-accent-soft disabled:opacity-50"
        >
          {mutation.isPending ? "Saving…" : "Save preferences"}
        </button>
        {saved && <span className="text-sm text-emerald-300">Saved</span>}
        {mutation.isError && <span className="text-sm text-red-400">Could not save</span>}
      </div>
    </form>
  );
}
