/**
 * POST /api/generate
 * BFF route: submit → poll → return model URLs to frontend.
 */

import { type NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";
const POLL_TIMEOUT = 600;
const POLL_INTERVAL = 3;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      prompt?: string;
      enable_pbr?: boolean;
      face_count?: number;
      generate_type?: string;
      polygon_type?: string;
      model?: string;
    };
    const { prompt, ...params } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    // Forward the user's JWT from the incoming request
    const authHeader = request.headers.get("authorization") || "";

    // Submit to FastAPI
    const submitRes = await fetch(`${BACKEND_URL}/jobs/text-to-3d`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({
        params: {
          prompt,
          enable_pbr: params.enable_pbr ?? false,
          face_count: params.face_count ?? 500000,
          generate_type: params.generate_type ?? "Normal",
          polygon_type: params.polygon_type ?? "triangle",
          model: params.model ?? "hy-3d-3.0",
        },
      }),
    });
    if (!submitRes.ok) {
      const err = await submitRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: (err as Record<string, unknown>).detail || `Submit failed` },
        { status: submitRes.status }
      );
    }

    const { id: jobId } = await submitRes.json();

    // Poll until done
    const deadline = Date.now() + POLL_TIMEOUT * 1000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL * 1000));
      const pollRes = await fetch(`${BACKEND_URL}/jobs/${jobId}`, {
        headers: authHeader ? { Authorization: authHeader } : {},
      });
      if (!pollRes.ok) continue;
      const job = await pollRes.json();

      if (job.status === "completed") {
        const artifacts: Array<Record<string, unknown>> = job.artifacts || [];
        const glb = artifacts.find((a) => a.artifact_type === "glb");
        const preview = artifacts.find((a) => a.artifact_type === "preview_image");

        return NextResponse.json({
          prompt, job_id: jobId, status: "ready",
          mesh: { meshUrl: glb?.download_url || null, meshFormat: "glb", fileSizeBytes: glb?.file_size_bytes || 0 },
          preview: { url: preview?.download_url || glb?.preview_image_url || null },
          artifacts: artifacts.map((a) => ({
            type: a.artifact_type, label: a.label, download_url: a.download_url,
            file_size_bytes: a.file_size_bytes,
          })),
        });
      }
      if (job.status === "failed") {
        return NextResponse.json(
          { error: job.error_message || "Generation failed", status: "error" },
          { status: 422 }
        );
      }
    }
    return NextResponse.json({ error: "Timed out", status: "error" }, { status: 504 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
