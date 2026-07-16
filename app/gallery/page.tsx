import ModelCard from "@/components/ModelCard";
import { mockModels } from "@/lib/mockModels";

export default function GalleryPage() {
  return (
    <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-semibold text-zinc-50 sm:text-4xl">
          Example models
        </h1>
        <p className="mt-3 text-zinc-400">
          A growing collection of models generated with mesh2nurbs.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {mockModels.map((model) => (
          <ModelCard key={model.id} model={model} />
        ))}
      </div>
    </section>
  );
}
