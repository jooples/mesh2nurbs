"use client";

import { useEffect, useState } from "react";
import { jobsApi, type EstimateResponse } from "@/lib/api";

function formatDuration(seconds: number): string {
  if (seconds < 90) return `~${Math.round(seconds)}s`;
  const mins = Math.round(seconds / 60);
  if (mins < 90) return `~${mins} min`;
  return `~${(mins / 60).toFixed(1)} hr`;
}

type Props = {
  jobType: string;
  faceCount?: number;
  alpha?: number;
  offset?: number;
  // "full" shows generation + post-process (job creation); "post_process_only"
  // shows just the post-process leg (retriggering on an already-generated job).
  mode?: "full" | "post_process_only";
  className?: string;
};

// Debounced fetch so dragging a slider doesn't spam the estimate endpoint —
// only the value the user settles on for 300ms triggers a request.
export default function TimeEstimate({ jobType, faceCount, alpha, offset, mode = "full", className }: Props) {
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      jobsApi
        .estimateTime({ job_type: jobType, face_count: faceCount, alpha, offset })
        .then((data) => {
          if (!cancelled) setEstimate(data);
        })
        .catch(() => {
          if (!cancelled) setEstimate(null);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [jobType, faceCount, alpha, offset]);

  if (!estimate) return null;

  const parts: string[] = [];
  if (mode === "full" && estimate.generation_estimated_seconds != null) {
    parts.push(`generation ${formatDuration(estimate.generation_estimated_seconds)}`);
  }
  if (estimate.post_process_estimated_seconds != null) {
    parts.push(`post-processing ${formatDuration(estimate.post_process_estimated_seconds)}`);
  }

  const highFailure =
    estimate.post_process_failure_rate != null && estimate.post_process_failure_rate >= 0.5;

  if (parts.length === 0) {
    return (
      <p className={`text-xs text-stone-500 ${className ?? ""}`}>
        Not enough historical data yet to estimate timing.
      </p>
    );
  }

  return (
    <p className={`text-xs text-stone-500 ${className ?? ""}`}>
      Estimated time: {parts.join(" + ")}
      {highFailure && (
        <span className="ml-1 text-amber-700 dark:text-amber-400">
          — similar params have failed {Math.round((estimate.post_process_failure_rate ?? 0) * 100)}% of the time recently
        </span>
      )}
    </p>
  );
}
