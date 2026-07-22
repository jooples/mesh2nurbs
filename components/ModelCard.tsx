import MeshViewer from "@/components/MeshViewer";
import type { MockModel } from "@/lib/mockModels";

export default function ModelCard({ model }: { model: MockModel }) {
  return (
    <div className="group flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl ring-1 ring-white/5 transition-all duration-200 group-hover:ring-violet-400/30 group-hover:shadow-lg group-hover:shadow-violet-950/40">
        <MeshViewer modelUrl={model.modelUrl} label="Example preview coming soon" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-zinc-50 transition-colors group-hover:text-violet-300">
          {model.name}
        </h3>
        <p className="text-sm text-zinc-400">{model.description}</p>
      </div>
    </div>
  );
}
