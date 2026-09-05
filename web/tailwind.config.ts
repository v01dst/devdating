import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#f4f5f7",
        raised: "#ffffff",
        accent: {
          DEFAULT: "#7c5cff",
          soft: "#5b3df0",
        },
        signal: "#0284c7",
        like: "#16a34a",
        pass: "#e11d48",
      },
      boxShadow: {
        glow: "0 0 45px rgba(124,92,255,0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
