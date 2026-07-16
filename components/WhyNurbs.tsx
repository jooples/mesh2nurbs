const points = [
  {
    title: "CAD-ready by design",
    description:
      "NURBS is the surface format CAD and manufacturing tools already speak — no lossy conversion from a mesh required.",
  },
  {
    title: "Infinite resolution",
    description:
      "Surfaces are defined mathematically, so they stay smooth at any zoom or export size instead of showing polygon facets.",
  },
  {
    title: "Editable after the fact",
    description:
      "Control points and curves can be adjusted directly, making it easy to refine a generated model instead of starting over.",
  },
  {
    title: "Built for manufacturing",
    description:
      "Watertight, precise surfaces are what 3D printing, CNC, and injection molding workflows expect.",
  },
];

export default function WhyNurbs() {
  return (
    <section id="why-nurbs" className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-24">
      <div className="mb-12 flex flex-col items-center gap-3 text-center">
        <h2 className="text-3xl font-semibold text-zinc-50">Why NURBS?</h2>
        <p className="max-w-xl text-zinc-400">
          Most text-to-3D tools stop at a mesh. We go one step further and
          convert it into NURBS surfaces — here&apos;s why that matters.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {points.map((point) => (
          <div
            key={point.title}
            className="rounded-2xl border border-white/10 bg-zinc-900 p-6"
          >
            <h3 className="text-lg font-semibold text-zinc-50">{point.title}</h3>
            <p className="mt-2 text-sm text-zinc-400">{point.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
