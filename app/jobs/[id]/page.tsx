"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import MeshViewer from "@/components/MeshViewer";
import NurbsUploadViewer from "@/components/NurbsUploadViewer";
import { jobsApi, type JobDetail, type Artifact } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const jobId = params.id as string;

  const [job, setJob] = useState<JobDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJob = useCallback(async () => {
    try {
      const data = await jobsApi.getJob(jobId);
      setJob(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load job");
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/jobs/${jobId}`);
      return;
    }
    fetchJob();

    // Poll while active
    const activeStatuses = ["pending", "submitted", "processing", "submitting", "downloading", "queued", "in_progress"];
    const interval = setInterval(() => {
      fetchJob().then(() => {
        // stop polling if terminal
        if (job && !activeStatuses.includes(job.status)) {
          clearInterval(interval);
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [jobId, isAuthenticated, router, fetchJob]);

  if (isLoading) {
    return (
      <section className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-6 py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </section>
    );
  }

  if (error || !job) {
    return (
      <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-16 text-center">
        <p className="text-red-400">{error || "Job not found"}</p>
      </section>
    );
  }

  const glb = job.artifacts?.find((a: Artifact) => a.artifact_type === "glb");
  const preview = job.artifacts?.find((a: Artifact) => a.artifact_type === "preview_image");
  const obj = job.artifacts?.find((a: Artifact) => a.artifact_type === "obj");
  // Not produced by the backend yet — the mesh2nurbs pipeline currently emits raw
  // .m patch files (artifact_type "nurbs_patches"), not this pre-tessellated JSON.
  // Wired up so it auto-loads as soon as that conversion exists.
  const nurbsJson = job.artifacts?.find((a: Artifact) => a.artifact_type === "nurbs_json");

  const statusColor: Record<string, string> = {
    completed: "text-emerald-400",
    failed: "text-red-400",
    pending: "text-amber-400",
    submitted: "text-blue-400",
    processing: "text-violet-400",
    downloading: "text-cyan-400",
  };

  return (
    <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      {/* Header */}
      <div className="mb-10">
        <button
          onClick={() => router.push("/gallery")}
          className="mb-4 text-sm text-zinc-500 hover:text-zinc-300"
        >
          ← Back to gallery
        </button>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold text-zinc-50">
            {typeof job.generation_params?.prompt === "string"
              ? (job.generation_params.prompt as string).slice(0, 80)
              : `${job.job_type} job`}
          </h1>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              statusColor[job.status] || "text-zinc-400"
            } bg-zinc-800`}
          >
            {job.status}
          </span>
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          Job ID: {jobId.slice(0, 8)}… | Created:{" "}
          {new Date(job.created_at).toLocaleString()}
        </p>
      </div>

      {/* Progress for active jobs */}
      {["pending", "submitted", "processing", "downloading"].includes(job.status) && (
        <div className="mb-10 w-full overflow-hidden rounded-full bg-zinc-800">
          <div className="h-2 animate-pulse rounded-full bg-violet-500" style={{ width: "60%" }} />
        </div>
      )}

      {/* 3D Viewer */}
      <div className="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="w-full">
          <h2 className="mb-4 text-lg font-medium text-zinc-50">Generated Model</h2>
          <MeshViewer
            modelUrl={glb?.download_url ?? undefined}
            previewUrl={preview?.download_url ?? undefined}
            label="Generated model"
          />
        </div>

        <div className="w-full">
          <h2 className="mb-4 text-lg font-medium text-zinc-50">NURBS Surface</h2>
          <NurbsUploadViewer
            initialUrl={nurbsJson?.download_url ?? undefined}
            initialLabel="Generated NURBS"
            emptyHint="No NURBS output for this job yet. Upload or drop a NURBS JSON file to preview it here."
          />
        </div>
      </div>

      {/* Params */}
      <div className="mb-10 flex flex-col gap-4">
        <h2 className="text-lg font-medium text-zinc-50">Generation Parameters</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {job.job_type && (
            <>
              <dt className="text-zinc-500">Type</dt>
              <dd className="text-zinc-300">{job.job_type}</dd>
            </>
          )}
          {typeof job.generation_params?.prompt === "string" && (
            <>
              <dt className="text-zinc-500">Prompt</dt>
              <dd className="text-zinc-300">
                {job.generation_params.prompt as string}
              </dd>
            </>
          )}
          {typeof job.generation_params?.face_count === "number" && (
            <>
              <dt className="text-zinc-500">Face count</dt>
              <dd className="text-zinc-300">
                {(job.generation_params.face_count as number).toLocaleString()}
              </dd>
            </>
          )}
          {typeof job.generation_params?.generate_type === "string" && (
            <>
              <dt className="text-zinc-500">Generate type</dt>
              <dd className="text-zinc-300">
                {job.generation_params.generate_type as string}
              </dd>
            </>
          )}
          {typeof job.generation_params?.enable_pbr === "boolean" && (
            <>
              <dt className="text-zinc-500">PBR</dt>
              <dd className="text-zinc-300">
                {job.generation_params.enable_pbr ? "Enabled" : "Disabled"}
              </dd>
            </>
          )}
        </dl>

        {/* Error */}
        {job.error_message && (
          <div className="rounded-lg border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-400">
            {job.error_message}
          </div>
        )}
      </div>

      {/* Pipeline stages */}
      {job.pipeline_definition?.length > 0 && (
        <div className="mb-10">
          <h2 className="mb-4 text-lg font-medium text-zinc-50">Pipeline</h2>
          <div className="flex flex-wrap gap-3">
            {job.pipeline_definition.map((stage, idx) => (
              <div
                key={idx}
                className={`rounded-full border px-4 py-2 text-xs ${
                  stage.status === "completed"
                    ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400"
                    : stage.status === "pending"
                      ? "border-zinc-700 bg-zinc-900 text-zinc-500"
                      : "border-violet-500/30 bg-violet-950/20 text-violet-400"
                }`}
              >
                {stage.type} — {stage.status}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Artifacts */}
      {job.artifacts?.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-medium text-zinc-50">Downloads</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {job.artifacts
              .filter((a) => a.artifact_type !== "preview_image")
              .map((a) => (
                <a
                  key={a.id}
                  href={a.download_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900 p-4 transition-colors ${
                    a.download_url
                      ? "hover:border-violet-400/50 hover:bg-zinc-800"
                      : "cursor-not-allowed opacity-50"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      {a.label || a.artifact_type.toUpperCase()}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {(a.file_size_bytes / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  <span className="text-lg">
                    {a.download_url ? "⬇" : "—"}
                  </span>
                </a>
              ))}
          </div>
        </div>
      )}
    </section>
  );
}
