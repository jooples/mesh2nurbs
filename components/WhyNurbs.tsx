const points = [
  {
    title: "CAD-ready by design",
    description:
      "NURBS is the surface format CAD and manufacturing tools already speak — no lossy conversion from a mesh required.",
    // Each card gets its own accent color so the grid doesn't read as four
    // identical grey boxes.
    icon: "📐",
    badge: "bg-violet-500/10 dark:bg-violet-500/15",
    glow: "hover:border-violet-400/40 hover:shadow-violet-950/50",
  },
  {
    title: "Infinite resolution",
    description:
      "Surfaces are defined mathematically, so they stay smooth at any zoom or export size instead of showing polygon facets.",
    icon: "♾️",
    badge: "bg-cyan-500/10 dark:bg-cyan-500/15",
    glow: "hover:border-cyan-400/40 hover:shadow-cyan-950/50",
  },
  {
    title: "Editable after the fact",
    description:
      "Control points and curves can be adjusted directly, making it easy to refine a generated model instead of starting over.",
    icon: "✏️",
    badge: "bg-fuchsia-500/10 dark:bg-fuchsia-500/15",
    glow: "hover:border-fuchsia-400/40 hover:shadow-fuchsia-950/50",
  },
  {
    title: "Built for manufacturing",
    description:
      "Watertight, precise surfaces are what 3D printing, CNC, and injection molding workflows expect.",
    icon: "🏭",
    badge: "bg-emerald-500/10 dark:bg-emerald-500/15",
    glow: "hover:border-emerald-400/40 hover:shadow-emerald-950/50",
  },
];

export default function WhyNurbs() {
  return (
    <section id="why-nurbs" className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-14">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <h2 className="text-3xl font-semibold text-stone-900 dark:bg-gradient-to-br dark:from-white dark:to-violet-200/80 dark:bg-clip-text dark:text-transparent">
          Why NURBS?
        </h2>
        <p className="max-w-xl text-stone-600 dark:text-zinc-400">
          Most text-to-3D tools stop at a mesh. We go one step further and
          convert it into NURBS surfaces — here&apos;s why that matters.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {points.map((point) => (
          <div
            key={point.title}
            className={`rounded-2xl border border-stone-200/70 bg-white shadow-sm shadow-rose-900/[0.05] p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-zinc-900/60 ${point.glow}`}
          >
            <h3 className="flex items-center gap-3 text-lg font-semibold text-stone-900 dark:text-zinc-50">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${point.badge}`} aria-hidden>
                {point.icon}
              </span>
              {point.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
              {point.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
