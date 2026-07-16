export type NurbsResult = {
  nurbsUrl: string | null;
  status: "mock" | "ready" | "error";
};

/**
 * Converts a mesh (produced by Hunyuan3D, see lib/tencentHunyuan.ts) into a
 * NURBS surface model using our own mesh-to-NURBS pipeline.
 *
 * Not implemented yet — this pipeline doesn't exist. It may end up living in
 * this repo or as a separate service called over HTTP; either way, this
 * function is the seam: the API route calls it with a mesh URL and expects
 * a NurbsResult back, so callers don't need to change when it's built.
 */
export async function convertMeshToNurbs(meshUrl: string | null): Promise<NurbsResult> {
  void meshUrl;
  return { nurbsUrl: null, status: "mock" };
}
