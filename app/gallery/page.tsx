"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import MeshViewer from "@/components/MeshViewer";
import { jobsApi, type JobSummary } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// Stale-while-revalidate cache so repeat visits paint instantly instead of
// re-running the list query (and its per-card thumbnail fetches) every time.
// Keyed per-tab: the user's own id for "mine", a fixed key for "public".
const CACHE_PREFIX = "gallery_cache:";
const CACHE_MAX_AGE_MS = 5 * 60 * 1000;

function readCache(key: string): JobSummary[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { jobs, cachedAt } = JSON.parse(raw) as { jobs: JobSummary[]; cachedAt: number };
    if (Date.now() - cachedAt > CACHE_MAX_AGE_MS) return null;
    return jobs;
  } catch {
    return null;
  }
}

function writeCache(key: string, jobs: JobSummary[]) {
  try {
    sessionStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ jobs, cachedAt: Date.now() })
    );
  } catch {
    // sessionStorage full/unavailable — caching is a perf nicety, safe to skip
  }
}

type Tab = "mine" | "public";

export default function GalleryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      }
    >
      <GalleryPageInner />
    </Suspense>
  );
}

function GalleryPageInner() {
  const { isAuthenticated, user } = useAuth();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(
    searchParams.get("tab") === "public" ? "public" : "mine"
  );

  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [publicJobs, setPublicJobs] = useState<JobSummary[]>([]);
  const [publicLoading, setPublicLoading] = useState(true);
  const [publicError, setPublicError] = useState<string | null>(null);

  // Shared by both tabs — searches whichever one is currently active.
  // Debounced so typing doesn't fire a request per keystroke; the
  // client-side sessionStorage cache is only consulted/written for the
  // unfiltered (empty search) view, so a search never shows a stale cached
  // result set and never pollutes the cache with a filtered one.
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsLoading(false);
      return;
    }

    const cached = !debouncedSearch ? readCache(user.id) : null;
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
          search: debouncedSearch || undefined,
        });
        setJobs(data.items);
        if (!debouncedSearch) writeCache(user!.id, data.items);
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
  }, [isAuthenticated, user, debouncedSearch]);

  useEffect(() => {
    const cached = !debouncedSearch ? readCache("public") : null;
    if (cached) {
      setPublicJobs(cached);
      setPublicLoading(false);
    } else {
      setPublicLoading(true);
    }
    setPublicError(null);

    async function load() {
      try {
        const data = await jobsApi.listPublicJobs({
          per_page: 50,
          search: debouncedSearch || undefined,
        });
        setPublicJobs(data.items);
        if (!debouncedSearch) writeCache("public", data.items);
      } catch (err) {
        console.error("Failed to load public gallery:", err);
        if (!cached) {
          setPublicError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        setPublicLoading(false);
      }
    }
    load();
  }, [debouncedSearch]);

  return (
    <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
      <div className="mb-8 text-center">
        <h1 className="bg-gradient-to-br from-white to-violet-200/80 bg-clip-text text-3xl font-semibold text-transparent sm:text-4xl">
          Gallery
        </h1>
        <p className="mt-3 text-zinc-400">
          Browse models generated with mesh2nurbs.
        </p>
      </div>

      <div className="mb-10 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setTab("mine")}
          className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "mine"
              ? "border-violet-400/60 bg-violet-500/20 text-violet-200"
              : "border-white/10 bg-black/20 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Your Models
        </button>
        <button
          type="button"
          onClick={() => setTab("public")}
          className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "public"
              ? "border-violet-400/60 bg-violet-500/20 text-violet-200"
              : "border-white/10 bg-black/20 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Public Gallery
        </button>
      </div>

      <div className="mx-auto mb-10 max-w-sm">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tab === "mine" ? "Search your models…" : "Search the public gallery…"}
          className="w-full rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-violet-400/50"
        />
      </div>

      {tab === "mine" ? (
        isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          </div>
        ) : error ? (
          <p className="text-center text-sm text-red-400">{error}</p>
        ) : !isAuthenticated ? (
          <div className="text-center">
            <p className="mb-4 text-zinc-400">Sign in to see your generated models and start creating.</p>
            <Link
              href="/login"
              className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-8 py-3 font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-105 hover:shadow-violet-500/40"
            >
              Sign in to get started
            </Link>
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-16 text-center">
            {debouncedSearch ? (
              <p className="text-zinc-400">No models match &ldquo;{debouncedSearch}&rdquo;.</p>
            ) : (
              <>
                <p className="text-zinc-400">No models yet.</p>
                <Link
                  href="/create"
                  className="mt-4 inline-block rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-105 hover:shadow-violet-500/40"
                >
                  Create your first model
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <GalleryJobCard key={job.id} job={job} />
            ))}
          </div>
        )
      ) : publicLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      ) : publicError ? (
        <p className="text-center text-sm text-red-400">{publicError}</p>
      ) : publicJobs.length === 0 ? (
        <div className="py-16 text-center">
          {debouncedSearch ? (
            <p className="text-zinc-400">No public models match &ldquo;{debouncedSearch}&rdquo;.</p>
          ) : (
            <>
              <p className="text-zinc-400">No public models yet.</p>
              <p className="mt-1 text-sm text-zinc-500">
                Completed a model you like? Publish it from its job page to feature it here.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {publicJobs.map((job) => (
            <PublicJobCard key={job.id} job={job} />
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
      <div className="relative overflow-hidden rounded-2xl ring-1 ring-white/5 transition-all duration-200 group-hover:shadow-lg group-hover:shadow-violet-950/40 group-hover:ring-violet-400/30">
        {job.is_public && (
          <span className="pointer-events-none absolute bottom-2 left-2 z-10 rounded-full bg-violet-500/90 px-2 py-0.5 text-[10px] font-medium text-white shadow">
            Published
          </span>
        )}
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

function PublicJobCard({ job }: { job: JobSummary }) {
  const title = job.title || job.job_type;

  return (
    <Link href={`/gallery/public/${job.id}`} className="group flex flex-col gap-3">
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
          by {job.publisher_name || "Anonymous"} · {new Date(job.created_at).toLocaleDateString()}
        </p>
      </div>
    </Link>
  );
}
