"use client";

import { useTheme } from "@/lib/theme";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="fixed bottom-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-stone-200/70 bg-white/90 text-stone-500 shadow-lg shadow-rose-900/[0.08] backdrop-blur-md transition-colors hover:text-stone-900 dark:border-white/10 dark:bg-zinc-900/90 dark:text-zinc-400 dark:hover:text-white"
    >
      {theme === "dark" ? (
        <span aria-hidden>☀️</span>
      ) : (
        <span aria-hidden>🌙</span>
      )}
    </button>
  );
}
