/**
 * POST /api/generate
 * Thin BFF proxy — submit text-to-3D job and return immediately with job ID.
 * Status polling happens on the job detail page (/jobs/[id]).
 */

import { type NextRequest, NextResponse } from "next/server";

// Server-side: use docker internal URL when NEXT_PUBLIC_API_URL is a relative path
const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  (process.env.NEXT_PUBLIC_API_URL?.startsWith("/")
    ? "http://web:8000/v1"
    : process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8000/v1";

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

    // Forward JWT from incoming request
    const authHeader = request.headers.get("authorization") || "";

    // Submit to backend — return immediately (no polling)
    const res = await fetch(`${BACKEND_URL}/jobs/text-to-3d`, {
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

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: (err as Record<string, unknown>).detail || "Submit failed" },
        { status: res.status }
      );
    }

    const { id: jobId, status } = await res.json();
    return NextResponse.json({ job_id: jobId, status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
