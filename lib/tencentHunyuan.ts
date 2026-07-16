export type MeshResult = {
  meshUrl: string | null;
  status: "mock" | "ready" | "error";
};

/**
 * Calls Tencent Cloud's Hunyuan3D API to turn a text prompt into a mesh.
 *
 * Not implemented yet. When wiring up the real integration:
 * - Requires env vars TENCENT_SECRET_ID, TENCENT_SECRET_KEY, HUANYUAN_ENDPOINT
 *   (add them to .env.local, see .env.local.example).
 * - Tencent Cloud APIs are typically signed (TC3-HMAC-SHA256) — use the
 *   official Tencent Cloud SDK for Node rather than hand-rolling signing.
 * - This function's return shape (MeshResult) is the contract the rest of
 *   the app is built against, so the API route and UI won't need to change.
 */
export async function generateMeshFromText(prompt: string): Promise<MeshResult> {
  void prompt;
  return { meshUrl: null, status: "mock" };
}
