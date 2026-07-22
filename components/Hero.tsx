import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative flex min-h-[calc(100vh-65px)] flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* Neon horizon — violet core with a cyan counter-glow off to the side */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(55% 45% at 50% 28%, rgba(124,110,242,0.24), transparent 70%), radial-gradient(40% 35% at 78% 62%, rgba(34,211,238,0.10), transparent 70%), radial-gradient(35% 30% at 20% 70%, rgba(217,70,239,0.08), transparent 70%)",
        }}
      />

      <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-violet-300 backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
        Text to NURBS
      </p>

      <h1 className="max-w-3xl bg-gradient-to-br from-white via-white to-violet-200 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-6xl">
        Describe it. Get a 3D model ready for CAD.
      </h1>

      <p className="mt-6 max-w-xl text-lg text-zinc-400">
        mesh2nurbs turns a text prompt into a clean NURBS surface model —
        no modeling software required.
      </p>

      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
        <Link
          href="/create"
          className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-violet-500/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-violet-500/40"
        >
          Generate your model
        </Link>
        <Link
          href="#why-nurbs"
          className="rounded-full border border-white/15 px-8 py-4 text-base font-medium text-zinc-200 transition-colors hover:border-cyan-400/40 hover:bg-white/5 hover:text-white"
        >
          Why NURBS?
        </Link>
      </div>
    </section>
  );
}
