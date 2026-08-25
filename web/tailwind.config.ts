import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#08080d",
        raised: "#10101a",
        accent: {
          DEFAULT: "#7c5cff",
          soft: "#a48bff",
        },
        signal: "#22d3ee",
        like: "#22c55e",
        pass: "#f43f5e",
      },
      boxShadow: {
        glow: "0 0 45px rgba(124,92,255,0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
