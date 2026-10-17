"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export default function Popover({ label, children, className = "w-48" }: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [mode, setMode] = useState<"hover" | "pinned" | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!mode) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setMode(null);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [mode]);

  return (
    <div ref={root} className="relative"
      onPointerEnter={(e) => { if (e.pointerType === "mouse") setMode((v) => v ?? "hover"); }}
      onPointerLeave={() => {
        if (!root.current?.contains(document.activeElement)) setMode((v) => v === "hover" ? null : v);
      }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setMode(null); }}
      onKeyDown={(e) => {
        if (e.key === "Escape") { e.preventDefault(); setMode(null); trigger.current?.focus(); }
        if (e.key === "ArrowDown" && e.target === trigger.current) {
          e.preventDefault(); setMode("pinned");
          requestAnimationFrame(() => root.current?.querySelector<HTMLElement>("[data-popover-panel] a, [data-popover-panel] button")?.focus());
        }
      }}>
      <button ref={trigger} type="button" aria-expanded={mode !== null} aria-controls={panelId}
        onClick={() => setMode((v) => v === "pinned" ? null : "pinned")}
        className="flex items-center gap-1 rounded-full bg-stone-200 px-3 py-2 text-xs text-stone-700 transition-colors hover:bg-stone-300 focus-visible:outline-2 focus-visible:outline-violet-500 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
        {label}<span aria-hidden="true" className="ml-1 opacity-50">▾</span>
      </button>
      {mode && <div id={panelId} data-popover-panel className={`absolute right-0 top-full z-50 pt-1 ${className}`}
        onClick={(e) => { if ((e.target as HTMLElement).closest("a, button")) setMode(null); }}>
        <div className="rounded-xl border border-stone-200/70 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-zinc-900">{children}</div>
      </div>}
    </div>
  );
}
