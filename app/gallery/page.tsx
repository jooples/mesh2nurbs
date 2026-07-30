"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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

type Tab = "recent" | "mine" | "public";
const UNSORTED = "__unsorted__";

export default function GalleryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-14">
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
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get("tab");
    return t === "public" || t === "mine" ? t : "recent";
  });

  const [recentJobs, setRecentJobs] = useState<JobSummary[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState<string | null>(null);

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
  const [activeAlbum, setActiveAlbum] = useState<string | null>(null); // null = all, "mine" tab only

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Unlike "mine" (completed only, curated), this pulls every status —
  // an activity feed for jobs still in flight, not just finished ones.
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setRecentLoading(false);
      return;
    }

    const cacheKey = `recent:${user.id}`;
    const cached = !debouncedSearch ? readCache(cacheKey) : null;
    if (cached) {
      setRecentJobs(cached);
      setRecentLoading(false);
    } else {
      setRecentLoading(true);
    }
    setRecentError(null);

    async function load() {
      try {
        const data = await jobsApi.listJobs({
          per_page: 24,
          search: debouncedSearch || undefined,
        });
        setRecentJobs(data.items);
        if (!debouncedSearch) writeCache(cacheKey, data.items);
      } catch (err) {
        console.error("Failed to load recent models:", err);
        if (!cached) {
          setRecentError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        setRecentLoading(false);
      }
    }
    load();
  }, [isAuthenticated, user, debouncedSearch]);

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

  const albums = useMemo(() => {
    const set = new Set<string>();
    for (const j of jobs) if (j.album) set.add(j.album);
    return Array.from(set).sort();
  }, [jobs]);

  const displayedJobs = useMemo(() => {
    if (!activeAlbum) return jobs;
    if (activeAlbum === UNSORTED) return jobs.filter((j) => !j.album);
    return jobs.filter((j) => j.album === activeAlbum);
  }, [jobs, activeAlbum]);

  const handleAlbumChange = (jobId: string, album: string | null) => {
    setJobs((prev) => {
      const next = prev.map((j) => (j.id === jobId ? { ...j, album } : j));
      if (user) writeCache(user.id, next);
      return next;
    });
  };

  const handleDelete = (jobId: string) => {
    setJobs((prev) => {
      const next = prev.filter((j) => j.id !== jobId);
      if (user) writeCache(user.id, next);
      return next;
    });
  };

  return (
    <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold text-stone-900 sm:text-4xl dark:bg-gradient-to-br dark:from-white dark:to-violet-200/80 dark:bg-clip-text dark:text-transparent">
          Gallery
        </h1>
        <p className="mt-3 text-stone-600 dark:text-zinc-400">
          Browse models generated with Geonesis.
        </p>
      </div>

      <div className="mb-10 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setTab("recent")}
          className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "recent"
              ? "border-violet-400/60 bg-violet-500/20 text-violet-800 dark:text-violet-200"
              : "border-stone-200 bg-stone-100 text-stone-600 hover:text-stone-900 dark:border-white/10 dark:bg-black/20 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          Recent
        </button>
        <button
          type="button"
          onClick={() => setTab("mine")}
          className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "mine"
              ? "border-violet-400/60 bg-violet-500/20 text-violet-800 dark:text-violet-200"
              : "border-stone-200 bg-stone-100 text-stone-600 hover:text-stone-900 dark:border-white/10 dark:bg-black/20 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          Your Models
        </button>
        <button
          type="button"
          onClick={() => setTab("public")}
          className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "public"
              ? "border-violet-400/60 bg-violet-500/20 text-violet-800 dark:text-violet-200"
              : "border-stone-200 bg-stone-100 text-stone-600 hover:text-stone-900 dark:border-white/10 dark:bg-black/20 dark:text-zinc-400 dark:hover:text-zinc-200"
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
          placeholder={tab === "public" ? "Search the public gallery…" : "Search your models…"}
          className="w-full rounded-full border border-stone-200 bg-stone-100 px-4 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-violet-400/50 dark:border-white/10 dark:bg-black/20 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
      </div>

      <datalist id="known-albums">
        {albums.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>

      {tab === "mine" && isAuthenticated && jobs.length > 0 && (albums.length > 0 || jobs.some((j) => !j.album)) && (
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setActiveAlbum(null)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              activeAlbum === null
                ? "bg-gradient-to-r from-violet-600 to-rose-400 text-white"
                : "bg-stone-200 text-stone-600 hover:text-stone-900 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            All
          </button>
          {albums.map((album) => (
            <button
              key={album}
              onClick={() => setActiveAlbum(album)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                activeAlbum === album
                  ? "bg-gradient-to-r from-violet-600 to-rose-400 text-white"
                  : "bg-stone-200 text-stone-600 hover:text-stone-900 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {album}
            </button>
          ))}
          {jobs.some((j) => !j.album) && (
            <button
              onClick={() => setActiveAlbum(UNSORTED)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                activeAlbum === UNSORTED
                  ? "bg-gradient-to-r from-violet-600 to-rose-400 text-white"
                  : "bg-stone-200 text-stone-600 hover:text-stone-900 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              Unsorted
            </button>
          )}
        </div>
      )}

      {tab === "recent" ? (
        recentLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          </div>
        ) : recentError ? (
          <p className="text-center text-sm text-red-600 dark:text-red-400">{recentError}</p>
        ) : !isAuthenticated ? (
          <div className="text-center">
            <p className="mb-4 text-stone-600 dark:text-zinc-400">Sign in to see your recent activity.</p>
            <Link
              href="/login"
              className="rounded-full bg-gradient-to-r from-violet-600 to-rose-400 px-8 py-3 font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-105 hover:shadow-violet-500/40"
            >
              Sign in to get started
            </Link>
          </div>
        ) : recentJobs.length === 0 ? (
          <div className="py-10 text-center">
            {debouncedSearch ? (
              <p className="text-stone-600 dark:text-zinc-400">No models match &ldquo;{debouncedSearch}&rdquo;.</p>
            ) : (
              <>
                <p className="text-stone-600 dark:text-zinc-400">No models yet.</p>
                <Link
                  href="/create"
                  className="mt-4 inline-block rounded-full bg-gradient-to-r from-violet-600 to-rose-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-105 hover:shadow-violet-500/40"
                >
                  Create your first model
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {recentJobs.map((job) => (
              <RecentJobCard key={job.id} job={job} />
            ))}
          </div>
        )
      ) : tab === "mine" ? (
        isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          </div>
        ) : error ? (
          <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : !isAuthenticated ? (
          <div className="text-center">
            <p className="mb-4 text-stone-600 dark:text-zinc-400">Sign in to see your generated models and start creating.</p>
            <Link
              href="/login"
              className="rounded-full bg-gradient-to-r from-violet-600 to-rose-400 px-8 py-3 font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-105 hover:shadow-violet-500/40"
            >
              Sign in to get started
            </Link>
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-10 text-center">
            {debouncedSearch ? (
              <p className="text-stone-600 dark:text-zinc-400">No models match &ldquo;{debouncedSearch}&rdquo;.</p>
            ) : (
              <>
                <p className="text-stone-600 dark:text-zinc-400">No models yet.</p>
                <Link
                  href="/create"
                  className="mt-4 inline-block rounded-full bg-gradient-to-r from-violet-600 to-rose-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-105 hover:shadow-violet-500/40"
                >
                  Create your first model
                </Link>
              </>
            )}
          </div>
        ) : displayedJobs.length === 0 ? (
          <p className="py-10 text-center text-sm text-stone-500">No models in this album.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayedJobs.map((job) => (
              <GalleryJobCard key={job.id} job={job} onAlbumChange={handleAlbumChange} onDelete={handleDelete} />
            ))}
          </div>
        )
      ) : publicLoading ? (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      ) : publicError ? (
        <p className="text-center text-sm text-red-600 dark:text-red-400">{publicError}</p>
      ) : publicJobs.length === 0 ? (
        <div className="py-10 text-center">
          {debouncedSearch ? (
            <p className="text-stone-600 dark:text-zinc-400">No public models match &ldquo;{debouncedSearch}&rdquo;.</p>
          ) : (
            <>
              <p className="text-stone-600 dark:text-zinc-400">No public models yet.</p>
              <p className="mt-1 text-sm text-stone-500">
                Completed a model you like? Publish it from its job page to feature it here.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {publicJobs.map((job) => (
            <PublicJobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </section>
  );
}

function GalleryJobCard({
  job,
  onAlbumChange,
  onDelete,
}: {
  job: JobSummary;
  onAlbumChange: (jobId: string, album: string | null) => void;
  onDelete: (jobId: string) => void;
}) {
  const title = job.title || job.job_type;
  const [editingAlbum, setEditingAlbum] = useState(false);
  const [albumInput, setAlbumInput] = useState(job.album || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const saveAlbum = async () => {
    const value = albumInput.trim() || null;
    setEditingAlbum(false);
    if (value === (job.album || null)) return;
    setSaving(true);
    try {
      await jobsApi.setAlbum(job.id, value);
      onAlbumChange(job.id, value);
    } catch {
      setAlbumInput(job.album || "");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${title}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await jobsApi.deleteJob(job.id);
      onDelete(job.id);
    } catch (err) {
      setDeleting(false);
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <div className={`group flex flex-col gap-3 ${deleting ? "pointer-events-none opacity-40" : ""}`}>
      {/* draggable={false}: next/link renders an <a>, which is natively
          draggable — without this, a rotate-drag starting anywhere on the
          card gets hijacked into the browser's native link-drag instead of
          reaching the canvas's OrbitControls underneath. */}
      <Link href={`/jobs/${job.id}`} draggable={false}>
        <div className="relative overflow-hidden rounded-2xl ring-1 ring-stone-200 transition-all duration-200 group-hover:shadow-lg group-hover:shadow-violet-950/10 group-hover:ring-violet-400/30 dark:ring-white/5 dark:group-hover:shadow-violet-950/40">
          {job.is_public && (
            <span className="pointer-events-none absolute bottom-2 left-2 z-10 rounded-full bg-violet-500/90 px-2 py-0.5 text-[10px] font-medium text-white shadow">
              Published
            </span>
          )}
          <button
            onClick={handleDelete}
            onPointerDown={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
            aria-label="Delete model"
            title="Delete model"
            className="absolute bottom-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-sm text-white opacity-0 backdrop-blur-sm transition-all hover:bg-red-600 group-hover:opacity-100"
          >
            🗑
          </button>
          <MeshViewer
            modelUrl={job.glb_url ?? undefined}
            previewUrl={job.preview_image_url ?? undefined}
          />
        </div>
      </Link>
      <div>
        <Link href={`/jobs/${job.id}`}>
          <h3 className="truncate text-sm font-semibold text-stone-900 transition-colors group-hover:text-violet-600 dark:text-zinc-50 dark:group-hover:text-violet-300">
            {title}
          </h3>
        </Link>
        <p className="mt-0.5 text-xs text-stone-500">
          {job.job_type} · {new Date(job.created_at).toLocaleDateString()}
        </p>

        {editingAlbum ? (
          <input
            autoFocus
            list="known-albums"
            value={albumInput}
            onChange={(e) => setAlbumInput(e.target.value)}
            onBlur={saveAlbum}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                setAlbumInput(job.album || "");
                setEditingAlbum(false);
              }
            }}
            placeholder="Album name…"
            className="mt-1.5 w-full rounded-md border border-violet-400/50 bg-white px-2 py-1 text-xs text-stone-900 focus:outline-none dark:bg-zinc-900 dark:text-zinc-50"
          />
        ) : (
          <button
            onClick={(e) => {
              e.preventDefault();
              setEditingAlbum(true);
            }}
            className="mt-1.5 flex items-center gap-1 text-[11px] text-stone-500 hover:text-violet-600 dark:hover:text-violet-300"
          >
            {saving ? (
              "Saving…"
            ) : job.album ? (
              <>📁 {job.album}</>
            ) : (
              <span className="opacity-0 transition-opacity group-hover:opacity-100">
                + Add to album
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function PublicJobCard({ job }: { job: JobSummary }) {
  const title = job.title || job.job_type;

  return (
    <Link href={`/gallery/public/${job.id}`} draggable={false} className="group flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl ring-1 ring-stone-200 transition-all duration-200 group-hover:shadow-lg group-hover:shadow-violet-950/10 group-hover:ring-violet-400/30 dark:ring-white/5 dark:group-hover:shadow-violet-950/40">
        <MeshViewer
          modelUrl={job.glb_url ?? undefined}
          previewUrl={job.preview_image_url ?? undefined}
        />
      </div>
      <div>
        <h3 className="truncate text-sm font-semibold text-stone-900 transition-colors group-hover:text-violet-600 dark:text-zinc-50 dark:group-hover:text-violet-300">
          {title}
        </h3>
        <p className="mt-0.5 text-xs text-stone-500">
          by {job.publisher_name || "Anonymous"} · {new Date(job.created_at).toLocaleDateString()}
        </p>
      </div>
    </Link>
  );
}

// Activity-feed card for the "Recent" tab — unlike GalleryJobCard (completed
// models only), this covers every status, so it renders a flat 2D preview
// image instead of a 3D viewer (many cards on screen at once, and a WebGL
// canvas per card is unnecessary here) with a status placeholder while
// processing or if generation failed.
function RecentJobCard({ job }: { job: JobSummary }) {
  const title = job.title || job.job_type;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (job.status !== "completed") return;
    let cancelled = false;
    jobsApi
      .getJob(job.id)
      .then((detail) => {
        if (cancelled) return;
        const preview = detail.artifacts?.find((a) => a.artifact_type === "preview_image");
        setPreviewUrl(preview?.download_url ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [job.id, job.status]);

  return (
    <Link
      href={`/jobs/${job.id}`}
      draggable={false}
      className="group rounded-xl border border-stone-200/70 bg-white p-3 shadow-sm shadow-rose-900/[0.05] transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-400/30 hover:shadow-lg hover:shadow-violet-950/10 dark:border-white/5 dark:bg-zinc-900/60 dark:hover:shadow-violet-950/40"
    >
      {job.status === "failed" || job.status === "cancelled" ? (
        <div className="mb-2 flex aspect-square items-center justify-center rounded-lg border border-red-500/10 bg-red-50 dark:bg-red-950/20">
          <span className="text-xl" aria-hidden>⚠️</span>
        </div>
      ) : job.status !== "completed" ? (
        <div className="mb-2 flex aspect-square items-center justify-center rounded-lg bg-gradient-to-br from-stone-200 to-stone-300 dark:from-zinc-800 dark:to-zinc-900">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
        </div>
      ) : previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          className="mb-2 aspect-square w-full rounded-lg bg-stone-100 object-cover dark:bg-zinc-900"
        />
      ) : (
        <div className="mb-2 flex aspect-square items-center justify-center rounded-lg bg-gradient-to-br from-stone-200 to-stone-300 text-stone-500 dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-600">
          <span className="text-xl" aria-hidden>🧊</span>
        </div>
      )}
      <p className="truncate text-xs text-stone-500 group-hover:text-stone-900 dark:text-zinc-400 dark:group-hover:text-stone-200">
        {title}
      </p>
      <span
        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] ${
          job.status === "completed"
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            : job.status === "failed" || job.status === "cancelled"
              ? "bg-red-500/10 text-red-700 dark:text-red-400"
              : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
        }`}
      >
        {job.status}
      </span>
    </Link>
  );
}
