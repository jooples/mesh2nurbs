const points = [
  {
    title: "CAD-ready by design",
    description:
      "NURBS is the surface format CAD and manufacturing tools already speak — no lossy conversion from a mesh required.",
    // Each card gets its own accent color so the grid doesn't read as four
    // identical grey boxes.
    dot: "bg-violet-400",
    glow: "hover:border-violet-400/40 hover:shadow-violet-950/50",
  },
  {
    title: "Infinite resolution",
    description:
      "Surfaces are defined mathematically, so they stay smooth at any zoom or export size instead of showing polygon facets.",
    dot: "bg-cyan-400",
    glow: "hover:border-cyan-400/40 hover:shadow-cyan-950/50",
  },
  {
    title: "Editable after the fact",
    description:
      "Control points and curves can be adjusted directly, making it easy to refine a generated model instead of starting over.",
    dot: "bg-fuchsia-400",
    glow: "hover:border-fuchsia-400/40 hover:shadow-fuchsia-950/50",
  },
  {
    title: "Built for manufacturing",
    description:
      "Watertight, precise surfaces are what 3D printing, CNC, and injection molding workflows expect.",
    dot: "bg-emerald-400",
    glow: "hover:border-emerald-400/40 hover:shadow-emerald-950/50",
  },
];

export default function WhyNurbs() {
  return (
    <section id="why-nurbs" className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-24">
      <div className="mb-12 flex flex-col items-center gap-3 text-center">
        <h2 className="bg-gradient-to-br from-white to-violet-200/80 bg-clip-text text-3xl font-semibold text-transparent">
          Why NURBS?
        </h2>
        <p className="max-w-xl text-zinc-400">
          Most text-to-3D tools stop at a mesh. We go one step further and
          convert it into NURBS surfaces — here&apos;s why that matters.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {points.map((point) => (
          <div
            key={point.title}
            className={`rounded-2xl border border-white/10 bg-zinc-900/60 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${point.glow}`}
          >
            <h3 className="flex items-center gap-2.5 text-lg font-semibold text-zinc-50">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${point.dot}`} />
              {point.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              {point.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
