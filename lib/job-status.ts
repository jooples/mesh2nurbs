import type { JobDetail } from "./api";

export const ACTIVE_STATUSES = ["pending", "submitted", "processing", "submitting", "downloading", "queued", "in_progress"];

export function isPostProcessPending(data: JobDetail): boolean {
  return data.status === "completed" && (data.pipeline_definition ?? []).some((stage) =>
    stage.type === "post_process" && stage.status === "pending"
    // New runs include an operation ID, including manually queued conversions.
    // Older opt-out jobs can have an unused pending placeholder; do not poll those forever.
    && (Boolean(stage.operation_id) || data.generation_params.auto_post_process !== false));
}

export function isJobActive(data: JobDetail): boolean {
  return ACTIVE_STATUSES.includes(data.status) || isPostProcessPending(data)
    || (data.pipeline_definition ?? []).some((stage) => stage.status === "processing");
}
