/**
 * Hunyuan3D generation pipeline via our FastAPI backend.
 *
 * Flow: POST /v1/jobs/{text-to-3d|image-to-3d} → poll → return artifact URLs.
 * Uses the shared API client (lib/api.ts) with JWT auth.
 */

import { jobsApi, type TextTo3DParams, type JobDetail } from "./api";

export type MeshResult = {
  meshUrl: string | null;
  previewUrl: string | null;
  jobId: string | null;
  status: "ready" | "error" | "pending";
  error?: string;
};

export type GenerationParams = {
  prompt?: string;
  imageBase64?: string;
  enable_pbr?: boolean;
  face_count?: number;
  generate_type?: "Normal" | "LowPoly" | "Geometry" | "Sketch";
  polygon_type?: "triangle" | "quadrilateral";
  model?: string;
};

/**
 * Poll a job until it reaches a terminal state.
 * Returns the job detail with artifact URLs.
 */
async function pollJob(jobId: string, maxWait = 600, interval = 3): Promise<JobDetail> {
  const deadline = Date.now() + maxWait * 1000;

  while (Date.now() < deadline) {
    const job = await jobsApi.getJob(jobId);
    const status = job.status;

    if (status === "completed" || status === "failed") {
      return job;
    }
    // Keep polling for active states
    if (!["pending", "submitted", "processing", "submitting", "downloading", "queued", "in_progress"].includes(status)) {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, interval * 1000));
  }

  throw new Error(`Job ${jobId} timed out after ${maxWait}s`);
}

/**
 * Submit a text-to-3D job, poll until done, return the GLB download URL.
 */
export async function generateMeshFromText(
  prompt: string,
  params?: Omit<GenerationParams, "prompt" | "imageBase64">
): Promise<MeshResult> {
  try {
    const apiParams: TextTo3DParams = {
      prompt,
      ...(params?.enable_pbr !== undefined && { enable_pbr: params.enable_pbr }),
      ...(params?.face_count && { face_count: params.face_count }),
      ...(params?.generate_type && { generate_type: params.generate_type }),
      ...(params?.polygon_type && { polygon_type: params.polygon_type }),
      ...(params?.model && { model: params.model }),
    };

    const jobResp = await jobsApi.createTextTo3D(apiParams);
    const job = await pollJob(jobResp.id);

    if (job.status === "failed") {
      return {
        meshUrl: null,
        previewUrl: null,
        jobId: job.id,
        status: "error",
        error: job.error_message || "Generation failed",
      };
    }

    // Find GLB artifact
    const glb = job.artifacts?.find((a) => a.artifact_type === "glb");
    const preview = job.artifacts?.find((a) => a.artifact_type === "preview_image");

    return {
      meshUrl: glb?.download_url || null,
      previewUrl: preview?.download_url || glb?.preview_image_url || null,
      jobId: job.id,
      status: "ready",
    };
  } catch (err) {
    return {
      meshUrl: null,
      previewUrl: null,
      jobId: null,
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Submit an image-to-3D job, poll until done, return the GLB download URL.
 */
export async function generateMeshFromImage(
  imageFile: File,
  prompt?: string
): Promise<MeshResult> {
  try {
    const jobResp = await jobsApi.createImageTo3D(imageFile, prompt ? { prompt } : undefined);
    const job = await pollJob(jobResp.id);

    if (job.status === "failed") {
      return {
        meshUrl: null,
        previewUrl: null,
        jobId: job.id,
        status: "error",
        error: job.error_message || "Generation failed",
      };
    }

    const glb = job.artifacts?.find((a) => a.artifact_type === "glb");
    const preview = job.artifacts?.find((a) => a.artifact_type === "preview_image");

    return {
      meshUrl: glb?.download_url || null,
      previewUrl: preview?.download_url || glb?.preview_image_url || null,
      jobId: job.id,
      status: "ready",
    };
  } catch (err) {
    return {
      meshUrl: null,
      previewUrl: null,
      jobId: null,
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export { pollJob };
