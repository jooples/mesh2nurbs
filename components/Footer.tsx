export default function Footer() {
  return (
    <footer className="relative border-t border-white/10 py-8 text-center text-xs text-zinc-500">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
      <p>
        <span className="bg-gradient-to-r from-zinc-300 to-violet-300 bg-clip-text font-medium text-transparent">
          mesh2nurbs
        </span>{" "}
        — text-to-NURBS 3D model generation.
      </p>
    </footer>
  );
}
