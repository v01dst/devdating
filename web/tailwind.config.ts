import type { Config } from "tailwindcss";

/**
 * DevDating app skin — same world as the landing:
 * one UI accent (purple), warm ink on near-black, lime/red/amber/pink are
 * semantic tags only. Font stacks map to the next/font variables declared in
 * app/layout.tsx.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#0b0b0d",
        raised: "#17171d",
        ghost: "rgba(242,236,223,0.06)",
        line: {
          DEFAULT: "rgba(242,236,223,0.12)",
          soft: "rgba(242,236,223,0.07)",
        },
        ink: {
          DEFAULT: "#f2ecdf",
          soft: "#b8b1a4",
          dim: "#8f8a80",
          strong: "#141416",
        },
        accent: {
          DEFAULT: "#7c5cff",
          soft: "#a48bff",
          deep: "#5a35e8",
        },
        signal: "#8ab4ff",
        like: "#c2ff2e",
        pass: "#ff4d2e",
        heart: "#ff3355",
        warn: "#ffb400",
      },
      fontFamily: {
        sans: ["var(--font-grot)", "Segoe UI", "system-ui", "sans-serif"],
        round: ["var(--font-round)", "Baloo 2", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["var(--font-label)", "ui-monospace", "Cascadia Mono", "Menlo", "monospace"],
      },
      boxShadow: {
        glow: "0 0 45px rgba(124,92,255,0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
