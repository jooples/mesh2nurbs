"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import MeshViewer from "@/components/MeshViewer";
import NurbsUploadViewer from "@/components/NurbsUploadViewer";
import { jobsApi, ApiError, type PublicJobDetail } from "@/lib/api";

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-stone-900 dark:text-zinc-50">
      <span className="h-4 w-1 rounded-full bg-violet-500" />
      {children}
    </h2>
  );
}

// Read-only mirror of the owner's job detail page for a published model —
// same viewer/params/downloads sections, deliberately without any of the
// owner-only actions (post-process re-run, publish toggle, delete).
export default function PublicJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<PublicJobDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    jobsApi
      .getPublicJob(jobId)
      .then((data) => {
        if (!cancelled) setJob(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setError("This model isn't public, or doesn't exist.");
        } else {
          setError(err instanceof Error ? err.message : "Failed to load model");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  if (isLoading) {
    return (
      <section className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-6 py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </section>
    );
  }

  if (error || !job) {
    return (
      <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-10 text-center">
        <p className="text-red-600 dark:text-red-400">{error || "Model not found."}</p>
        <button
          onClick={() => router.push("/gallery?tab=public")}
          className="mt-4 text-sm text-stone-500 transition-colors hover:text-stone-900 dark:hover:text-zinc-300"
        >
          ← Back to gallery
        </button>
      </section>
    );
  }

  const glb = job.artifacts.find((a) => a.artifact_type === "glb");
  const preview = job.artifacts.find(
    (a) => a.artifact_type === "preview_image" && a.stage === glb?.stage
  );
  const nurbsJson = job.artifacts.find((a) => a.artifact_type === "nurbs_json");
  const gp = job.generation_params;

  return (
    <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <div className="mb-8">
        <button
          onClick={() => router.push("/gallery?tab=public")}
          className="mb-4 text-sm text-stone-500 transition-colors hover:text-stone-900 dark:hover:text-zinc-300"
        >
          ← Back to gallery
        </button>
        <h1 className="truncate text-2xl font-semibold text-stone-900 dark:text-zinc-50" title={job.title ?? undefined}>
          {job.title || job.job_type}
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          by {job.publisher_name || "Anonymous"} · {new Date(job.created_at).toLocaleString()}
        </p>
      </div>

      {/* 3D Viewer */}
      <div className="mb-8 rounded-2xl border border-stone-200/70 bg-white shadow-sm shadow-rose-900/[0.05] p-6 dark:border-white/10 dark:bg-zinc-900/40">
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
              initialLabel={
                nurbsJson?.label
                  ? nurbsJson.label.replace("NURBS JSON (Viewer)", "Generated NURBS")
                  : "Generated NURBS"
              }
              emptyHint="No NURBS output for this model."
            />
          </div>
        </div>
      </div>

      {/* Params */}
      <div className="mb-8 rounded-2xl border border-stone-200/70 bg-white shadow-sm shadow-rose-900/[0.05] p-6 dark:border-white/10 dark:bg-zinc-900/40">
        <SectionHeading>Generation Parameters</SectionHeading>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
          <dt className="text-stone-500">Type</dt>
          <dd className="text-stone-700 dark:text-zinc-300">{job.job_type}</dd>

          {typeof gp?.prompt === "string" && (
            <>
              <dt className="text-stone-500">Prompt</dt>
              <dd className="text-stone-700 dark:text-zinc-300">{gp.prompt as string}</dd>
            </>
          )}
          {typeof gp?.face_count === "number" && (
            <>
              <dt className="text-stone-500">Face count</dt>
              <dd className="text-stone-700 dark:text-zinc-300">{(gp.face_count as number).toLocaleString()}</dd>
            </>
          )}
          {typeof gp?.generate_type === "string" && (
            <>
              <dt className="text-stone-500">Generate type</dt>
              <dd className="text-stone-700 dark:text-zinc-300">{gp.generate_type as string}</dd>
            </>
          )}
          {typeof gp?.polygon_type === "string" && (
            <>
              <dt className="text-stone-500">Polygon type</dt>
              <dd className="text-stone-700 dark:text-zinc-300">{gp.polygon_type as string}</dd>
            </>
          )}
          {typeof gp?.enable_pbr === "boolean" && (
            <>
              <dt className="text-stone-500">PBR</dt>
              <dd className="text-stone-700 dark:text-zinc-300">{gp.enable_pbr ? "Enabled" : "Disabled"}</dd>
            </>
          )}
          {typeof gp?.alpha === "number" && (
            <>
              <dt className="text-stone-500">Alpha wrap</dt>
              <dd className="text-stone-700 dark:text-zinc-300">{gp.alpha as number}</dd>
            </>
          )}
          {typeof gp?.offset === "number" && (
            <>
              <dt className="text-stone-500">Offset</dt>
              <dd className="text-stone-700 dark:text-zinc-300">{gp.offset as number}</dd>
            </>
          )}
        </dl>
      </div>

      {/* Downloads */}
      {job.artifacts.length > 0 && (
        <div className="rounded-2xl border border-stone-200/70 bg-white shadow-sm shadow-rose-900/[0.05] p-6 dark:border-white/10 dark:bg-zinc-900/40">
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
                  className={`flex items-center justify-between rounded-xl border border-stone-200/70 bg-white shadow-sm shadow-rose-900/[0.05] p-4 transition-all dark:border-white/10 dark:bg-zinc-900 ${
                    a.download_url
                      ? "hover:-translate-y-0.5 hover:border-violet-400/50 hover:bg-stone-100 hover:shadow-lg hover:shadow-violet-950/10 dark:hover:bg-zinc-800 dark:hover:shadow-violet-950/40"
                      : "cursor-not-allowed opacity-50"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-stone-800 dark:text-zinc-200">
                      {a.label || a.artifact_type.toUpperCase()}
                    </p>
                    <p className="text-xs text-stone-500">
                      {(a.file_size_bytes / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  <span className="text-lg">{a.download_url ? "⬇" : "—"}</span>
                </a>
              ))}
          </div>
        </div>
      )}
    </section>
  );
}
