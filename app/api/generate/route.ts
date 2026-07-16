import { generateMeshFromText } from "@/lib/tencentHunyuan";
import { convertMeshToNurbs } from "@/lib/meshToNurbs";

export async function POST(request: Request) {
  const { prompt } = (await request.json()) as { prompt?: string };

  if (!prompt || !prompt.trim()) {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }

  // Two-step pipeline: text -> mesh (Hunyuan3D) -> NURBS (our pipeline).
  // Both steps are mocked for now; this route is the seam where the real
  // calls get dropped in without changing the request/response contract.
  const mesh = await generateMeshFromText(prompt);
  const nurbs = await convertMeshToNurbs(mesh.meshUrl);

  return Response.json({
    prompt,
    status: "mock",
    message:
      "Generation pipeline is not connected yet — this is a placeholder response.",
    mesh,
    nurbs,
  });
}
