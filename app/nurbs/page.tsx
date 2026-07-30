import NurbsUploadViewer from "@/components/NurbsUploadViewer";

export default function NurbsPage() {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-10">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-stone-900 sm:text-4xl dark:bg-gradient-to-br dark:from-white dark:to-violet-200 dark:bg-clip-text dark:text-transparent">
          NURBS patch viewer
        </h1>
        <p className="mt-3 text-stone-600 dark:text-zinc-400">
          Renders a NURBS surface with its control points and control net.
          Upload or drag in your own JSON file matching the sample schema, or
          view the built-in example.
        </p>
      </div>

      <div className="mx-auto w-full max-w-md">
        <NurbsUploadViewer initialUrl="/sample-nurbs.json" initialLabel="Sample surface" />
      </div>
    </section>
  );
}
