import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative flex min-h-[calc(100vh-65px)] flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 30%, rgba(124,110,242,0.35), transparent 70%)",
        }}
      />
      <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-violet-400">
        Text to NURBS
      </p>
      <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-zinc-50 sm:text-6xl">
        Describe it. Get a 3D model ready for CAD.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-zinc-400">
        mesh2nurbs turns a text prompt into a clean NURBS surface model —
        no modeling software required.
      </p>
      <Link
        href="/create"
        className="mt-10 rounded-full bg-violet-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-violet-500/30 transition-transform hover:scale-105 hover:bg-violet-400"
      >
        Generate your model
      </Link>
    </section>
  );
}
