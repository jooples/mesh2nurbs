"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MeshViewer from "@/components/MeshViewer";
import { jobsApi, type JobSummary } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// Stale-while-revalidate cache so repeat visits paint instantly instead of
// re-running the list query (and its per-card thumbnail fetches) every time.
const CACHE_PREFIX = "gallery_cache:";
const CACHE_MAX_AGE_MS = 5 * 60 * 1000;

function readCache(userId: string): JobSummary[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + userId);
    if (!raw) return null;
    const { jobs, cachedAt } = JSON.parse(raw) as { jobs: JobSummary[]; cachedAt: number };
    if (Date.now() - cachedAt > CACHE_MAX_AGE_MS) return null;
    return jobs;
  } catch {
    return null;
  }
}

function writeCache(userId: string, jobs: JobSummary[]) {
  try {
    sessionStorage.setItem(
      CACHE_PREFIX + userId,
      JSON.stringify({ jobs, cachedAt: Date.now() })
    );
  } catch {
    // sessionStorage full/unavailable — caching is a perf nicety, safe to skip
  }
}

export default function GalleryPage() {
  const { isAuthenticated, user } = useAuth();
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsLoading(false);
      return;
    }

    const cached = readCache(user.id);
    if (cached) {
      setJobs(cached);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
    setError(null);

    async function load() {
      try {
        const data = await jobsApi.listJobs({
          status: "completed",
          per_page: 50,
        });
        setJobs(data.items);
        writeCache(user!.id, data.items);
      } catch (err) {
        console.error("Failed to load gallery:", err);
        if (!cached) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [isAuthenticated, user]);

  return (
    <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
      <div className="mb-12 text-center">
        <h1 className="bg-gradient-to-br from-white to-violet-200/80 bg-clip-text text-3xl font-semibold text-transparent sm:text-4xl">
          {isAuthenticated ? "Your models" : "Example models"}
        </h1>
        <p className="mt-3 text-zinc-400">
          {isAuthenticated
            ? "Models you've generated with mesh2nurbs."
            : "Sign in to see your generated models and start creating."}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      ) : error ? (
        <p className="text-center text-sm text-red-400">{error}</p>
      ) : !isAuthenticated ? (
        <div className="text-center">
          <Link
            href="/login"
            className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-8 py-3 font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-105 hover:shadow-violet-500/40"
          >
            Sign in to get started
          </Link>
        </div>
      ) : jobs.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-zinc-400">No models yet.</p>
          <Link
            href="/create"
            className="mt-4 inline-block rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-105 hover:shadow-violet-500/40"
          >
            Create your first model
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <GalleryJobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </section>
  );
}

function GalleryJobCard({ job }: { job: JobSummary }) {
  const title = job.title || job.job_type;

  return (
    <Link href={`/jobs/${job.id}`} className="group flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl ring-1 ring-white/5 transition-all duration-200 group-hover:shadow-lg group-hover:shadow-violet-950/40 group-hover:ring-violet-400/30">
        <MeshViewer
          modelUrl={job.glb_url ?? undefined}
          previewUrl={job.preview_image_url ?? undefined}
        />
      </div>
      <div>
        <h3 className="truncate text-sm font-semibold text-zinc-50 transition-colors group-hover:text-violet-300">
          {title}
        </h3>
        <p className="mt-0.5 text-xs text-zinc-500">
          {job.job_type} · {new Date(job.created_at).toLocaleDateString()}
        </p>
      </div>
    </Link>
  );
}
