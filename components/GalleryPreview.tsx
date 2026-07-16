import Link from "next/link";
import ModelCard from "@/components/ModelCard";
import { mockModels } from "@/lib/mockModels";

export default function GalleryPreview() {
  const previewModels = mockModels.slice(0, 3);

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-24">
      <div className="mb-10 flex flex-col items-center gap-3 text-center">
        <h2 className="text-3xl font-semibold text-zinc-50">
          See what mesh2nurbs can build
        </h2>
        <p className="max-w-xl text-zinc-400">
          A few examples of generated models. Real previews will appear here
          once the generation pipeline is connected.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {previewModels.map((model) => (
          <ModelCard key={model.id} model={model} />
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <Link
          href="/gallery"
          className="rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/10"
        >
          View full gallery
        </Link>
      </div>
    </section>
  );
}
