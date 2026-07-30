export default function Footer() {
  return (
    <footer className="relative border-t border-stone-200 py-8 text-center text-xs text-stone-500 dark:border-white/10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
      <p>
        <span className="font-medium text-stone-700 dark:bg-gradient-to-r dark:from-zinc-300 dark:to-violet-300 dark:bg-clip-text dark:text-transparent">
          Geonesis
        </span>{" "}
        — text-to-NURBS 3D model generation.
      </p>
    </footer>
  );
}
