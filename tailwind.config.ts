import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "rgb(var(--paper) / <alpha-value>)",
        panel: "rgb(var(--panel) / <alpha-value>)",
        overlay: "rgb(var(--overlay) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        faint: "rgb(var(--faint) / <alpha-value>)",
        coral: {
          DEFAULT: "rgb(var(--coral) / <alpha-value>)",
          ink: "rgb(var(--coral-ink) / <alpha-value>)",
        },
        peach: {
          DEFAULT: "rgb(var(--peach) / <alpha-value>)",
          ink: "rgb(var(--peach-ink) / <alpha-value>)",
        },
        ice: {
          DEFAULT: "rgb(var(--ice) / <alpha-value>)",
          ink: "rgb(var(--ice-ink) / <alpha-value>)",
        },
        oncoral: "#173042",
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
        sans: ["'Inter'", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        "glow-coral": "0 0 24px rgba(254,101,79,0.30)",
        "glow-peach": "0 0 24px rgba(254,209,140,0.50)",
        panel: "0 8px 32px var(--shadow-panel)",
      },
    },
  },
  plugins: [],
};

export default config;