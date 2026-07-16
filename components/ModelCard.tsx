import MeshViewer from "@/components/MeshViewer";
import type { MockModel } from "@/lib/mockModels";

export default function ModelCard({ model }: { model: MockModel }) {
  return (
    <div className="flex flex-col gap-3">
      <MeshViewer label="Example preview coming soon" />
      <div>
        <h3 className="text-sm font-semibold text-zinc-50">{model.name}</h3>
        <p className="text-sm text-zinc-400">{model.description}</p>
      </div>
    </div>
  );
}
