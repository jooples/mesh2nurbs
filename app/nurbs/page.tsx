import NurbsViewer from "@/components/NurbsViewer";

export default function NurbsPage() {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-zinc-50 sm:text-4xl">
          NURBS patch viewer
        </h1>
        <p className="mt-3 text-zinc-400">
          Renders <code>public/sample-nurbs.json</code> — a NURBS surface
          with its control points and control net.
        </p>
      </div>

      <div className="mx-auto w-full max-w-md">
        <NurbsViewer url="/sample-nurbs.json" />
      </div>
    </section>
  );
}
