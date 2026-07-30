"use client";

import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import MeshViewer from "@/components/MeshViewer";
import NurbsUploadViewer from "@/components/NurbsUploadViewer";
import TimeEstimate from "@/components/TimeEstimate";
import { jobsApi, type JobDetail, type Artifact } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCredits } from "@/lib/credits";

const ACTIVE_STATUSES = ["pending", "submitted", "processing", "submitting", "downloading", "queued", "in_progress"];

// A job is "active" (worth polling / showing progress for) if either the
// overall job is mid-generation, or any pipeline stage — including
// post-process, which doesn't change job.status — is actively running.
function isJobActive(data: JobDetail): boolean {
  if (ACTIVE_STATUSES.includes(data.status)) return true;
  return (data.pipeline_definition ?? []).some((s) => s.status === "processing");
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-stone-900 dark:text-zinc-50">
      <span className="h-4 w-1 rounded-full bg-violet-500" />
      {children}
    </h2>
  );
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
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
  // Bridges the brief window right after triggering post-process where the
  // stage is still "pending" (not yet picked up by the worker) — without
  // this, a poll landing in that gap would look inactive and the polling
  // loop would stop before ever seeing "processing" or the final result.
  const ppActiveRef = useRef(false);
  // Detects the processing → completed/failed transition so we can surface
  // a one-time "it's done" message even if the user isn't watching.
  const prevPpStatusRef = useRef<string | undefined>(undefined);
  const [ppLoading, setPpLoading] = useState(false);
  const [ppMsg, setPpMsg] = useState<string | null>(null);
  const [ppMsgKind, setPpMsgKind] = useState<"info" | "success" | "error">("info");
  const [ppAlpha, setPpAlpha] = useState(0.05);
  const [ppOffset, setPpOffset] = useState(0.005);
  const ppParamsInitRef = useRef(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Kept entirely separate from ppMsg/ppMsgKind (the post-process/regenerate
  // NURBS status area) so a publish error never shows up under the wrong
  // section — see the bug this was split out to fix.
  const [publishMsg, setPublishMsg] = useState<string | null>(null);
  const [publishMsgKind, setPublishMsgKind] = useState<"success" | "error">("success");
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publicTitleInput, setPublicTitleInput] = useState("");
  const [publisherNameInput, setPublisherNameInput] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  // Per-stage-index start times for the fake progress trickle (see render).
  const stageTimersRef = useRef<Record<number, number>>({});
  // Forces a re-render every second while active so the trickle animates
  // smoothly instead of only jumping on each 3s poll.
  const [, setTick] = useState(0);

  const fetchJob = useCallback(async () => {
    try {
      const data = await jobsApi.getJob(jobId);
      setJob(data);
      setError(null);
      const active = ACTIVE_STATUSES.includes(data.status);
      if (wasActiveRef.current && !active) {
        refreshCredits();
      }
      wasActiveRef.current = active;

      const ppStatus = data.pipeline_definition?.find((s) => s.type === "post_process")?.status;
      if (prevPpStatusRef.current === "processing" && ppStatus === "completed") {
        setPpMsgKind("success");
        setPpMsg("Post-processing finished — NURBS output updated below.");
        // Credits are only deducted on a successful run (never on a failed
        // attempt), so this is the one moment the balance actually changes.
        refreshCredits();
      } else if (prevPpStatusRef.current === "processing" && ppStatus === "failed") {
        setPpMsgKind("error");
        setPpMsg(
          data.error_message
            ? `${data.error_message} (No credits were charged.)`
            : "Post-processing failed — no credits were charged."
        );
      }
      if (ppStatus === "completed" || ppStatus === "failed") {
        ppActiveRef.current = false;
      }
      prevPpStatusRef.current = ppStatus;

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load job");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [jobId, refreshCredits]);

  // Self-scheduling poll (rather than a fixed interval that dies once the
  // main job "completes") so it naturally resumes when a post-process re-run
  // is triggered later — see ppActiveRef and handlePostProcess below.
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCancelledRef = useRef(false);

  const poll = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    fetchJob().then((data) => {
      if (pollCancelledRef.current) return;
      if (data && (isJobActive(data) || ppActiveRef.current)) {
        pollTimeoutRef.current = setTimeout(poll, 3000);
      }
    });
  }, [fetchJob]);

  useEffect(() => {
    if (authLoading) return; // don't redirect until we actually know
    if (!isAuthenticated) {
      router.push(`/login?redirect=/jobs/${jobId}`);
      return;
    }

    pollCancelledRef.current = false;
    poll();

    return () => {
      pollCancelledRef.current = true;
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, [jobId, isAuthenticated, authLoading, router, poll]);

  // Pre-fill the alpha/offset controls with the job's last-used values
  // (from creation, or a prior re-run) once, when they first become available.
  useEffect(() => {
    if (ppParamsInitRef.current || !job) return;
    const a = job.generation_params?.alpha;
    const o = job.generation_params?.offset;
    if (typeof a === "number") setPpAlpha(a);
    if (typeof o === "number") setPpOffset(o);
    ppParamsInitRef.current = true;
  }, [job]);

  // Tick once a second while something is running so the (fake) progress
  // trickle below actually animates, instead of only jumping on each poll.
  useEffect(() => {
    if (!job || !(isJobActive(job) || ppActiveRef.current)) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [job]);

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
        <p className="text-red-600 dark:text-red-400">{error || "Job not found"}</p>
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
      await jobsApi.postProcess(jobId, { alpha: ppAlpha, offset: ppOffset });
      // The main job is likely already "completed", so the mount-level poll
      // loop may have stopped by now — this flag + restart keeps it going
      // until we actually observe the new run finish.
      ppActiveRef.current = true;
      // Reset any stale trickle timer from a previous run so the progress
      // bar starts this run's animation from zero instead of resuming near
      // its old cap.
      stageTimersRef.current = {};
      setPpMsgKind("info");
      setPpMsg("Post-processing started!");
      poll();
    } catch (err) {
      setPpMsgKind("error");
      setPpMsg(err instanceof Error ? err.message : "Failed");
    }
    finally { setPpLoading(false); }
  };

  const openPublishModal = () => {
    if (!job) return;
    setPublicTitleInput(job.public_title || job.title || "");
    setPublisherNameInput(job.publisher_name || "");
    setIsAnonymous(job.is_public ? !job.publisher_name : false);
    setPublishMsg(null);
    setShowPublishModal(true);
  };

  const handlePublishConfirm = async () => {
    if (!job || publishLoading) return;
    setPublishLoading(true);
    setPublishMsg(null);
    try {
      const result = await jobsApi.setPublished(jobId, true, {
        publicTitle: publicTitleInput,
        publisherName: isAnonymous ? undefined : publisherNameInput,
      });
      setJob({
        ...job,
        is_public: result.is_public,
        published_at: result.published_at,
        public_title: result.public_title,
        publisher_name: result.publisher_name,
      });
      setShowPublishModal(false);
      setPublishMsgKind("success");
      setPublishMsg("Published to the public gallery.");
    } catch (err) {
      setPublishMsgKind("error");
      setPublishMsg(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setPublishLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!job || deleting) return;
    if (!confirm(`Delete "${job.title || job.job_type}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await jobsApi.deleteJob(jobId);
      router.push("/gallery");
    } catch (err) {
      setDeleting(false);
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleUnpublish = async () => {
    if (!job || publishLoading) return;
    setPublishLoading(true);
    setPublishMsg(null);
    try {
      const result = await jobsApi.setPublished(jobId, false);
      setJob({ ...job, is_public: result.is_public, published_at: result.published_at });
      setShowPublishModal(false);
      setPublishMsgKind("success");
      setPublishMsg("Removed from the public gallery.");
    } catch (err) {
      setPublishMsgKind("error");
      setPublishMsg(err instanceof Error ? err.message : "Failed to unpublish");
    } finally {
      setPublishLoading(false);
    }
  };

  const statusColor: Record<string, string> = {
    completed: "text-emerald-700 dark:text-emerald-400",
    failed: "text-red-700 dark:text-red-400",
    pending: "text-amber-700 dark:text-amber-400",
    submitted: "text-blue-700 dark:text-blue-400",
    processing: "text-violet-700 dark:text-violet-400",
    downloading: "text-cyan-700 dark:text-cyan-400",
    post_processing: "text-fuchsia-700 dark:text-fuchsia-400",
  };

  const statusDot: Record<string, string> = {
    completed: "bg-emerald-400",
    failed: "bg-red-400",
    pending: "bg-amber-400",
    submitted: "bg-blue-400",
    processing: "bg-violet-400",
    downloading: "bg-cyan-400",
    post_processing: "bg-fuchsia-400",
  };

  const statusLabel: Record<string, string> = { post_processing: "post-processing" };

  const stages = job.pipeline_definition ?? [];
  const ppFailed = stages.some((s) => s.type === "post_process" && s.status === "failed");
  const ppRunning = stages.some((s) => s.type === "post_process" && s.status === "processing");
  const ppDone = stages.some((s) => s.type === "post_process" && s.status === "completed");

  // The post-process step doesn't touch job.status (it's a separate
  // pipeline stage), so the top badge would otherwise keep saying
  // "completed" the whole time it's re-running — surface it explicitly.
  const displayStatus = ppRunning || (ppActiveRef.current && job.status === "completed")
    ? "post_processing"
    : job.status;
  const isActive = isJobActive(job) || ppActiveRef.current;

  const completedStages = stages.filter((s) => s.status === "completed").length;
  const stageSlice = stages.length > 0 ? 100 / stages.length : 100;
  const baseline = completedStages * stageSlice;
  // No fine-grained progress signal exists from TokenHub or the CGAL
  // subprocess, so fake a smooth trickle within the current stage: it
  // asymptotically approaches (but never quite reaches) the top of that
  // stage's slice, then the next real poll snaps it to the true baseline.
  let activeStageIdx = stages.findIndex((s) => s.status === "processing");
  if (activeStageIdx < 0 && ppActiveRef.current) {
    activeStageIdx = stages.findIndex((s) => s.type === "post_process");
  }
  if (activeStageIdx >= 0 && !stageTimersRef.current[activeStageIdx]) {
    stageTimersRef.current[activeStageIdx] = Date.now();
  }
  const TRICKLE_TIME_CONSTANT_SEC = 45;
  const elapsedSec = activeStageIdx >= 0
    ? (Date.now() - stageTimersRef.current[activeStageIdx]) / 1000
    : 0;
  const trickle = activeStageIdx >= 0
    ? stageSlice * 0.92 * (1 - Math.exp(-elapsedSec / TRICKLE_TIME_CONSTANT_SEC))
    : 0;
  const progressPct = stages.length > 0
    ? Math.min(99, Math.max(4, Math.round(baseline + trickle)))
    : 15;

  return (
    <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push("/gallery")}
          className="mb-4 text-sm text-stone-500 transition-colors hover:text-stone-900 dark:hover:text-zinc-300"
        >
          ← Back to gallery
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="min-w-0 flex-1 truncate text-2xl font-semibold text-stone-900 dark:text-zinc-50" title={job.title ?? undefined}>
            {job.title || `${job.job_type} job`}
          </h1>
          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              statusColor[displayStatus] || "text-stone-600 dark:text-zinc-400"
            } bg-stone-200 dark:bg-zinc-800`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${statusDot[displayStatus] || "bg-stone-500"} ${
                isActive ? "animate-pulse" : ""
              }`}
            />
            {statusLabel[displayStatus] || displayStatus}
          </span>
          {job.status === "completed" && (
            <button
              type="button"
              onClick={openPublishModal}
              disabled={publishLoading}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                job.is_public
                  ? "border-violet-400/60 bg-violet-500/20 text-violet-800 hover:bg-violet-500/30 dark:text-violet-200"
                  : "border-stone-200 bg-stone-100 text-stone-600 hover:text-stone-900 dark:border-white/10 dark:bg-black/20 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
              title={
                job.is_public
                  ? "Visible in the public gallery — click to edit or unpublish"
                  : "Publish this model to the public gallery"
              }
            >
              {job.is_public ? "Published ✓" : "Publish to gallery"}
            </button>
          )}
        </div>
        <p className="mt-2 text-sm text-stone-500">
          Job ID: {jobId.slice(0, 8)}… | Created:{" "}
          {new Date(job.created_at).toLocaleString()}
        </p>
        {publishMsg && (
          <p className={`mt-2 text-sm ${publishMsgKind === "error" ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
            {publishMsg}
          </p>
        )}
      </div>

      {/* Progress for active jobs */}
      {isActive && (
        <div className="mb-8">
          <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-zinc-800">
            <div
              className="h-full animate-pulse rounded-full bg-gradient-to-r from-violet-600 via-violet-400 to-violet-500 transition-[width] duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-stone-500">
            You may leave this page — generation continues on the server even while you&apos;re gone.
          </p>
        </div>
      )}

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
              emptyHint="No NURBS output for this job yet. Upload or drop a NURBS JSON file to preview it here."
            />
          </div>
        </div>
      </div>

      {/* Params */}
      <div className="mb-8 rounded-2xl border border-stone-200/70 bg-white shadow-sm shadow-rose-900/[0.05] p-6 dark:border-white/10 dark:bg-zinc-900/40">
        <SectionHeading>Generation Parameters</SectionHeading>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
          {job.job_type && (
            <>
              <dt className="text-stone-500">Type</dt>
              <dd className="text-stone-700 dark:text-zinc-300">{job.job_type}</dd>
            </>
          )}
          {typeof job.generation_params?.prompt === "string" && (
            <>
              <dt className="text-stone-500">Prompt</dt>
              <dd className="text-stone-700 dark:text-zinc-300">
                {job.generation_params.prompt as string}
              </dd>
            </>
          )}
          {typeof job.generation_params?.face_count === "number" && (
            <>
              <dt className="text-stone-500">Face count</dt>
              <dd className="text-stone-700 dark:text-zinc-300">
                {(job.generation_params.face_count as number).toLocaleString()}
              </dd>
            </>
          )}
          {typeof job.generation_params?.generate_type === "string" && (
            <>
              <dt className="text-stone-500">Generate type</dt>
              <dd className="text-stone-700 dark:text-zinc-300">
                {job.generation_params.generate_type as string}
              </dd>
            </>
          )}
          {typeof job.generation_params?.enable_pbr === "boolean" && (
            <>
              <dt className="text-stone-500">PBR</dt>
              <dd className="text-stone-700 dark:text-zinc-300">
                {job.generation_params.enable_pbr ? "Enabled" : "Disabled"}
              </dd>
            </>
          )}
        </dl>

        {/* Error */}
        {job.error_message && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
            {job.error_message}
          </div>
        )}
      </div>

      {/* Pipeline stages */}
      {stages.length > 0 && (
        <div className="mb-8 rounded-2xl border border-stone-200/70 bg-white shadow-sm shadow-rose-900/[0.05] p-6 dark:border-white/10 dark:bg-zinc-900/40">
          <SectionHeading>Pipeline</SectionHeading>
          <div className="flex flex-wrap gap-3">
            {stages.map((stage, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs transition-colors ${
                  stage.status === "completed"
                    ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                    : stage.status === "pending"
                      ? "border-stone-300 bg-stone-100 text-stone-500 dark:border-zinc-700 dark:bg-zinc-900"
                      : "border-violet-500/30 bg-violet-50 text-violet-700 dark:bg-violet-950/20 dark:text-violet-400"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    stage.status === "completed"
                      ? "bg-emerald-400"
                      : stage.status === "pending"
                        ? "bg-stone-600"
                        : "bg-violet-400 animate-pulse"
                  }`}
                />
                {stage.type === "post_process" ? "post-processing" : stage.type} — {stage.status}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Post-process trigger / re-run with different parameters */}
      {job.status === "completed" && obj && !ppRunning && (
        <div className="mb-8 rounded-2xl border border-stone-200/70 bg-white shadow-sm shadow-rose-900/[0.05] p-6 dark:border-white/10 dark:bg-zinc-900/40">
          <SectionHeading>{ppDone ? "Regenerate NURBS" : "Post-Processing"}</SectionHeading>
          {ppFailed && (
            <p className="mb-3 text-sm text-red-600 dark:text-red-400">Post-processing failed. You can retry.</p>
          )}
          {ppDone && (
            <p className="mb-3 text-sm text-stone-500">
              Already converted to NURBS. Adjust the parameters below and
              re-run to regenerate from the same source mesh — this replaces
              the current NURBS output.
            </p>
          )}
          {ppMsg && (
            <p
              className={`mb-3 text-sm ${
                ppMsgKind === "success"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : ppMsgKind === "error"
                    ? "text-red-600 dark:text-red-400"
                    : "text-violet-600 dark:text-violet-400"
              }`}
            >
              {ppMsg}
            </p>
          )}

          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="flex items-center justify-between gap-2 text-xs text-stone-600 dark:text-zinc-400">
                <span>Alpha wrap coarseness</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={ppAlpha}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9.]/g, "");
                    setPpAlpha(v === "" ? 0 : Number(v));
                  }}
                  onBlur={(e) => {
                    const v = Number(e.target.value) || 0.05;
                    setPpAlpha(Math.min(0.2, Math.max(0.01, v)));
                  }}
                  className="w-20 rounded-md border border-stone-300 bg-white px-2 py-1 text-right text-stone-900 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
              </span>
              <input
                type="range"
                min={0.01}
                max={0.2}
                step={0.01}
                value={ppAlpha}
                onChange={(e) => setPpAlpha(Number(e.target.value))}
                className="accent-violet-500"
              />
              <span className="text-[11px] text-stone-500">
                How tightly the wrap hugs the mesh — lower preserves more
                detail but is more likely to fail on complex meshes; higher
                is coarser but more robust. 0.01–0.2 (default 0.05).
              </span>
            </label>

            <label className="flex flex-col gap-1">
              <span className="flex items-center justify-between gap-2 text-xs text-stone-600 dark:text-zinc-400">
                <span>Offset</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={ppOffset}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9.]/g, "");
                    setPpOffset(v === "" ? 0 : Number(v));
                  }}
                  onBlur={(e) => {
                    const v = Number(e.target.value) || 0.005;
                    setPpOffset(Math.min(0.02, Math.max(0.001, v)));
                  }}
                  className="w-20 rounded-md border border-stone-300 bg-white px-2 py-1 text-right text-stone-900 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
              </span>
              <input
                type="range"
                min={0.001}
                max={0.02}
                step={0.001}
                value={ppOffset}
                onChange={(e) => setPpOffset(Number(e.target.value))}
                className="accent-violet-500"
              />
              <span className="text-[11px] text-stone-500">
                Buffer distance added around the mesh during wrapping —
                helps bridge small holes/gaps; larger values thicken thin
                features. 0.001–0.02 (default 0.005).
              </span>
            </label>
          </div>

          <TimeEstimate
            jobType={job.job_type}
            faceCount={typeof job.generation_params?.face_count === "number" ? job.generation_params.face_count : undefined}
            alpha={ppAlpha}
            offset={ppOffset}
            mode="post_process_only"
            className="mb-3"
          />

          <button
            onClick={handlePostProcess}
            disabled={ppLoading}
            className="rounded-full bg-violet-500 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-400 disabled:opacity-50"
          >
            {ppLoading
              ? "Starting…"
              : ppDone
                ? "Regenerate NURBS"
                : ppFailed
                  ? "Retry Post-Process"
                  : "Post Process (Alpha Wrap + Mesh2NURBS)"}
          </button>
        </div>
      )}
      {ppRunning && (
        <div className="mb-8 rounded-2xl border border-violet-500/30 bg-white p-6 dark:bg-zinc-900/40">
          <SectionHeading>Post-Processing</SectionHeading>
          <p className="text-sm text-violet-700 dark:text-violet-400 flex items-center gap-2">
            <span className="h-3 w-3 animate-spin rounded-full border border-violet-500 border-t-transparent" />
            Processing mesh…
          </p>
        </div>
      )}

      {/* Artifacts */}
      {job.artifacts?.length > 0 && (
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
                  <span className="text-lg">
                    {a.download_url ? "⬇" : "—"}
                  </span>
                </a>
              ))}
          </div>
        </div>
      )}

      <div className="mt-10 flex justify-end border-t border-stone-200 pt-6 dark:border-white/10">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs font-medium text-stone-400 transition-colors hover:text-red-600 disabled:opacity-50 dark:text-zinc-600 dark:hover:text-red-400"
        >
          {deleting ? "Deleting…" : "Delete this model"}
        </button>
      </div>

      {showPublishModal && job && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm dark:bg-black/80"
          onClick={() => !publishLoading && setShowPublishModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-stone-200/70 bg-white shadow-sm shadow-rose-900/[0.05] p-6 dark:border-white/10 dark:bg-zinc-950"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-lg font-semibold text-stone-900 dark:text-zinc-50">
              {job.is_public ? "Edit gallery listing" : "Publish to gallery"}
            </h2>
            <p className="mb-5 text-sm text-stone-500">
              Visible to everyone on the Public Gallery tab — no sign-in required.
            </p>

            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-zinc-400">Object name</label>
            <input
              type="text"
              value={publicTitleInput}
              onChange={(e) => setPublicTitleInput(e.target.value)}
              placeholder={job.title || "Untitled"}
              maxLength={120}
              className="mb-4 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none focus:border-violet-400/50 dark:border-white/10 dark:bg-black/30 dark:text-zinc-100"
            />

            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-zinc-400">Your name</label>
            <input
              type="text"
              value={publisherNameInput}
              onChange={(e) => setPublisherNameInput(e.target.value)}
              disabled={isAnonymous}
              placeholder="Shown as the creator"
              maxLength={60}
              className="mb-2 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none focus:border-violet-400/50 disabled:opacity-40 dark:border-white/10 dark:bg-black/30 dark:text-zinc-100"
            />
            <label className="mb-5 flex items-center gap-2 text-sm text-stone-600 dark:text-zinc-400">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-stone-300 bg-stone-50 accent-violet-500 dark:border-white/20 dark:bg-black/30"
              />
              Publish anonymously
            </label>

            {publishMsg && publishMsgKind === "error" && (
              <p className="mb-4 text-sm text-red-600 dark:text-red-400">{publishMsg}</p>
            )}

            <div className="flex items-center justify-between gap-3">
              {job.is_public ? (
                <button
                  type="button"
                  onClick={handleUnpublish}
                  disabled={publishLoading}
                  className="rounded-full border border-red-500/30 bg-red-50 px-4 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
                >
                  {publishLoading ? "…" : "Unpublish"}
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  disabled={publishLoading}
                  className="rounded-full border border-stone-200 bg-stone-100 px-4 py-2 text-xs font-medium text-stone-700 transition-colors hover:text-stone-900 disabled:opacity-50 dark:border-white/10 dark:bg-black/20 dark:text-zinc-300 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePublishConfirm}
                  disabled={publishLoading}
                  className="rounded-full bg-gradient-to-r from-violet-600 to-rose-400 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-violet-500/25 transition-all hover:shadow-lg hover:shadow-violet-500/40 disabled:opacity-50"
                >
                  {publishLoading ? "…" : job.is_public ? "Save changes" : "Publish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
