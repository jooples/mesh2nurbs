"use client";

import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import MeshViewer from "@/components/MeshViewer";
import NurbsUploadViewer from "@/components/NurbsUploadViewer";
import { jobsApi, type JobDetail, type Artifact } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCredits } from "@/lib/credits";

const ACTIVE_STATUSES = ["pending", "submitted", "processing", "submitting", "downloading", "queued", "in_progress"];

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-zinc-50">
      <span className="h-4 w-1 rounded-full bg-violet-500" />
      {children}
    </h2>
  );
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { refreshCredits } = useCredits();
  const jobId = params.id as string;

  const [job, setJob] = useState<JobDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Credits are deducted server-side once a job finishes processing (not at
  // submission time), so we can't know the new balance until we notice the
  // status flip here — track whether we were still "active" to refresh the
  // shared balance exactly on that transition.
  const wasActiveRef = useRef(true);
  const [ppLoading, setPpLoading] = useState(false);
  const [ppMsg, setPpMsg] = useState<string | null>(null);

  const fetchJob = useCallback(async () => {
    try {
      const data = await jobsApi.getJob(jobId);
      setJob(data);
      setError(null);
      const isActive = ACTIVE_STATUSES.includes(data.status);
      if (wasActiveRef.current && !isActive) {
        refreshCredits();
      }
      wasActiveRef.current = isActive;
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load job");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [jobId, refreshCredits]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/jobs/${jobId}`);
      return;
    }
    fetchJob();

    // Poll while active
    const interval = setInterval(() => {
      fetchJob().then((data) => {
        if (data && !ACTIVE_STATUSES.includes(data.status)) {
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

  const handlePostProcess = async () => {
    if (ppLoading) return;
    setPpLoading(true); setPpMsg(null);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/v1/jobs/${jobId}/post-process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Failed (${res.status})`);
      setPpMsg("Post-processing started!");
      fetchJob();
    } catch (err) { setPpMsg(err instanceof Error ? err.message : "Failed"); }
    finally { setPpLoading(false); }
  };

  const statusColor: Record<string, string> = {
    completed: "text-emerald-400",
    failed: "text-red-400",
    pending: "text-amber-400",
    submitted: "text-blue-400",
    processing: "text-violet-400",
    downloading: "text-cyan-400",
  };

  const statusDot: Record<string, string> = {
    completed: "bg-emerald-400",
    failed: "bg-red-400",
    pending: "bg-amber-400",
    submitted: "bg-blue-400",
    processing: "bg-violet-400",
    downloading: "bg-cyan-400",
  };

  const activeStatuses = ["pending", "submitted", "processing", "downloading"];
  const isActive = activeStatuses.includes(job.status);
  const stages = job.pipeline_definition ?? [];
  const ppFailed = stages.some((s) => s.type === "alpha_wrap" && s.status === "failed")
                || stages.some((s) => s.type === "mesh2nurbs" && s.status === "failed");
  const ppRunning = stages.some((s) => (s.type === "alpha_wrap" || s.type === "mesh2nurbs") && s.status === "processing");
  const ppDone = stages.some((s) => s.type === "mesh2nurbs" && s.status === "completed");
  const completedStages = stages.filter((s) => s.status === "completed").length;
  const progressPct = stages.length > 0
    ? Math.max(8, Math.round((completedStages / stages.length) * 100))
    : 15;

  return (
    <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push("/gallery")}
          className="mb-4 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          ← Back to gallery
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-zinc-50">
            {typeof job.generation_params?.prompt === "string"
              ? (job.generation_params.prompt as string).slice(0, 80)
              : `${job.job_type} job`}
          </h1>
          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              statusColor[job.status] || "text-zinc-400"
            } bg-zinc-800`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${statusDot[job.status] || "bg-zinc-500"} ${
                isActive ? "animate-pulse" : ""
              }`}
            />
            {job.status}
          </span>
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          Job ID: {jobId.slice(0, 8)}… | Created:{" "}
          {new Date(job.created_at).toLocaleString()}
        </p>
      </div>

      {/* Progress for active jobs */}
      {isActive && (
        <div className="mb-8 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full animate-pulse rounded-full bg-gradient-to-r from-violet-600 via-violet-400 to-violet-500 transition-[width] duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* 3D Viewer */}
      <div className="mb-8 rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="w-full">
            <SectionHeading>Generated Model</SectionHeading>
            <MeshViewer
              modelUrl={glb?.download_url ?? undefined}
              previewUrl={preview?.download_url ?? undefined}
              label="Generated model"
            />
          </div>

          <div className="w-full">
            <SectionHeading>NURBS Surface</SectionHeading>
            <NurbsUploadViewer
              initialUrl={nurbsJson?.download_url ?? undefined}
              initialLabel="Generated NURBS"
              emptyHint="No NURBS output for this job yet. Upload or drop a NURBS JSON file to preview it here."
            />
          </div>
        </div>
      </div>

      {/* Params */}
      <div className="mb-8 rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
        <SectionHeading>Generation Parameters</SectionHeading>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
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
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-400">
            {job.error_message}
          </div>
        )}
      </div>

      {/* Pipeline stages */}
      {stages.length > 0 && (
        <div className="mb-8 rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
          <SectionHeading>Pipeline</SectionHeading>
          <div className="flex flex-wrap gap-3">
            {stages.map((stage, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs transition-colors ${
                  stage.status === "completed"
                    ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400"
                    : stage.status === "pending"
                      ? "border-zinc-700 bg-zinc-900 text-zinc-500"
                      : "border-violet-500/30 bg-violet-950/20 text-violet-400"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    stage.status === "completed"
                      ? "bg-emerald-400"
                      : stage.status === "pending"
                        ? "bg-zinc-600"
                        : "bg-violet-400 animate-pulse"
                  }`}
                />
                {stage.type} — {stage.status}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Post-process retry button */}
      {job.status === "completed" && obj && !ppRunning && !ppDone && (
        <div className="mb-8 rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
          <SectionHeading>Post-Processing</SectionHeading>
          {ppFailed && (
            <p className="mb-3 text-sm text-red-400">Post-processing failed. You can retry.</p>
          )}
          {ppMsg && (
            <p className={`mb-3 text-sm ${ppMsg.includes("started") ? "text-violet-400" : "text-red-400"}`}>{ppMsg}</p>
          )}
          <button
            onClick={handlePostProcess}
            disabled={ppLoading}
            className="rounded-full bg-violet-500 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-400 disabled:opacity-50"
          >
            {ppLoading ? "Starting…" : ppFailed ? "Retry Post-Process" : "Post Process (Alpha Wrap + Mesh2NURBS)"}
          </button>
        </div>
      )}
      {ppRunning && (
        <div className="mb-8 rounded-2xl border border-violet-500/30 bg-zinc-900/40 p-6">
          <SectionHeading>Post-Processing</SectionHeading>
          <p className="text-sm text-violet-400 flex items-center gap-2">
            <span className="h-3 w-3 animate-spin rounded-full border border-violet-500 border-t-transparent" />
            Processing mesh…
          </p>
        </div>
      )}

      {/* Artifacts */}
      {job.artifacts?.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
          <SectionHeading>Downloads</SectionHeading>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {job.artifacts
              .filter((a) => a.artifact_type !== "preview_image")
              .map((a) => (
                <a
                  key={a.id}
                  href={a.download_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900 p-4 transition-all ${
                    a.download_url
                      ? "hover:-translate-y-0.5 hover:border-violet-400/50 hover:bg-zinc-800 hover:shadow-lg hover:shadow-violet-950/40"
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
