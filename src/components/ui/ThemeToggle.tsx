"use client";

import { Moon, Sun } from "lucide-react";
import { toggleTheme, useTheme } from "@/lib/theme";

export function ThemeToggle({ onDark = false }: { onDark?: boolean }) {
  const theme = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
        onDark
          ? "border-white/20 bg-white/10 text-white/85 hover:bg-white/20 hover:text-white"
          : "border-line bg-paper text-muted hover:border-faint hover:text-ink"
      }`}
    >
      {dark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}