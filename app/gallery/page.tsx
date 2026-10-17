"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ModelPreview from "@/components/ModelPreview";
import { useRemoteData } from "@/lib/use-remote-data";
import { jobsApi, type JobSummary } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Tab = "mine" | "public";
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
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "public" ? "public" : "mine";
  return <GalleryContent key={initialTab} initialTab={initialTab} />;
}

function GalleryContent({ initialTab }: { initialTab: Tab }) {
  const { isAuthenticated, user } = useAuth();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [showRecentPopover, setShowRecentPopover] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState({ search: "", album: null as string | null, page: 1 });
  const [revision, setRevision] = useState(0);
  const activeAlbum = query.album;
  const debouncedSearch = query.search;
  const page = query.page;
  const userId = user?.id;

  useEffect(() => {
    const timer = setTimeout(() => setQuery((previous) => previous.search === search.trim()
      ? previous : { ...previous, search: search.trim(), page: 1 }), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadJobs = useCallback((signal: AbortSignal) => tab === "public"
    ? jobsApi.listPublicJobs({ page, per_page: 12, search: debouncedSearch || undefined }, signal)
    : jobsApi.listJobs({ page, per_page: 12, status: "completed", search: debouncedSearch || undefined,
        album: activeAlbum && activeAlbum !== UNSORTED ? activeAlbum : undefined,
        unfiled: activeAlbum === UNSORTED }, signal),
  [tab, page, debouncedSearch, activeAlbum]);
  const list = useRemoteData(tab === "public" || isAuthenticated && userId
    ? JSON.stringify([tab, userId, query, revision]) : null, loadJobs);
  const loading = list.loading || search.trim() !== debouncedSearch;
  const jobs = tab === "mine" ? list.data?.items ?? [] : [];
  const publicJobs = tab === "public" ? list.data?.items ?? [] : [];
  const isLoading = loading;
  const publicLoading = loading;
  const error = list.error;
  const publicError = list.error;
  const displayedJobs = jobs;
  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, list.data?.total_pages ?? 1);

  const loadAlbums = useCallback((signal: AbortSignal) => jobsApi.listAlbums(signal), []);
  const albumList = useRemoteData(isAuthenticated && userId ? "albums:" + userId + ":" + revision : null, loadAlbums);
  const albums = albumList.data?.albums ?? [];
  const hasUnsorted = albumList.data?.has_unsorted ?? false;
  const loadRecent = useCallback((signal: AbortSignal) => jobsApi.listJobs({ per_page: 24 }, signal), []);
  const recent = useRemoteData(showRecentPopover && isAuthenticated && userId ? "recent:" + userId + ":" + revision : null, loadRecent);
  const recentJobs = recent.data?.items ?? [];
  const recentLoading = recent.loading;
  const recentError = recent.error;

  const switchTab = (next: Tab) => {
    setTab(next); setSearch(""); setQuery({ search: "", album: null, page: 1 }); setShowRecentPopover(false);
  };
  const setActiveAlbum = (album: string | null) => setQuery((previous) => ({ ...previous, album, page: 1 }));
  const handleAlbumChange = () => { setQuery((previous) => ({ ...previous, page: 1 })); setRevision((v) => v + 1); };
  const handleDelete = () => {
    if (jobs.length === 1 && page > 1) setQuery((previous) => ({ ...previous, page: previous.page - 1 }));
    setRevision((v) => v + 1);
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
          onClick={() => switchTab("mine")}
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
          onClick={() => switchTab("public")}
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
          aria-label="Search models"
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

      {tab === "mine" && isAuthenticated && (
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <button
              type="button"
              aria-expanded={showRecentPopover}
              aria-controls="recent-builds"
              onKeyDown={(e) => { if (e.key === "Escape") setShowRecentPopover(false); }}
              onClick={() => setShowRecentPopover((v) => !v)}
              className="rounded-full border border-stone-200 bg-stone-100 px-4 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:text-stone-900 dark:border-white/10 dark:bg-black/20 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Recent builds ▾
            </button>
            {showRecentPopover && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowRecentPopover(false)} />
                <div id="recent-builds" onKeyDown={(e) => { if (e.key === "Escape") setShowRecentPopover(false); }} className="absolute left-1/2 top-full z-50 mt-2 w-80 -translate-x-1/2 rounded-xl border border-stone-200 bg-white p-2 shadow-xl shadow-rose-900/[0.08] dark:border-white/10 dark:bg-zinc-900">
                  <div className="max-h-96 overflow-y-auto">
                    {recentLoading ? (
                      <div className="flex justify-center py-6">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                      </div>
                    ) : recentError ? (
                      <p className="px-3 py-4 text-center text-xs text-red-600 dark:text-red-400">{recentError}</p>
                    ) : recentJobs.length === 0 ? (
                      <p className="px-3 py-4 text-center text-xs text-stone-500">No recent activity.</p>
                    ) : (
                      recentJobs.map((job) => (
                        <RecentBuildRow key={job.id} job={job} onNavigate={() => setShowRecentPopover(false)} />
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "mine" && isAuthenticated && (albums.length > 0 || hasUnsorted) && (
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
          {hasUnsorted && (
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

      {tab === "mine" ? (
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
            ) : activeAlbum ? (
              <p className="text-stone-600 dark:text-zinc-400">No models in this album.</p>
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
      {(tab === "public" || isAuthenticated) && !error && (total > 0 || page > 1) && (
        <nav aria-label="Gallery pages" className="mt-8 flex items-center justify-center gap-4">
          <button type="button" disabled={loading || page <= 1} onClick={() => setQuery((p) => ({ ...p, page: p.page - 1 }))}
            className="rounded-full border px-4 py-2 text-sm disabled:opacity-40">Previous</button>
          <p role="status" className="text-sm text-stone-500">Page {page} of {totalPages} · {total} {total === 1 ? "model" : "models"}</p>
          <button type="button" disabled={loading || page >= totalPages} onClick={() => setQuery((p) => ({ ...p, page: p.page + 1 }))}
            className="rounded-full border px-4 py-2 text-sm disabled:opacity-40">Next</button>
        </nav>
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
  const [albumError, setAlbumError] = useState<string | null>(null);

  const saveAlbum = async () => {
    const value = albumInput.trim() || null;
    setEditingAlbum(false);
    if (value === (job.album || null)) return;
    setSaving(true);
    setAlbumError(null);
    try {
      await jobsApi.setAlbum(job.id, value);
      onAlbumChange(job.id, value);
    } catch {
      setAlbumInput(job.album || "");
      setAlbumError("Album could not be saved. Please try again.");
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
      <div className="relative overflow-hidden rounded-2xl ring-1 ring-stone-200 transition-all duration-200 group-hover:shadow-lg group-hover:shadow-violet-950/10 group-hover:ring-violet-400/30 dark:ring-white/5 dark:group-hover:shadow-violet-950/40">
        <Link href={`/jobs/${job.id}`} draggable={false}>
          {job.is_public && (
            <span className="pointer-events-none absolute bottom-2 left-2 z-10 rounded-full bg-violet-500/90 px-2 py-0.5 text-[10px] font-medium text-white shadow">
              Published
            </span>
          )}
          <ModelPreview src={job.preview_image_url} title={title} />
        </Link>
        <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Delete model"
            title="Delete model"
            className="absolute bottom-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-sm text-white opacity-100 backdrop-blur-sm transition-all hover:bg-red-600 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
          >
            🗑
          </button>
      </div>
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
            disabled={saving}
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
              <span className="opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 group-focus-within:opacity-100">
                + Add to album
              </span>
            )}
          </button>
        )}
        {albumError && <p role="alert" className="mt-1 text-xs text-red-600">{albumError}</p>}
      </div>
    </div>
  );
}

function PublicJobCard({ job }: { job: JobSummary }) {
  const title = job.title || job.job_type;

  return (
    <Link href={`/gallery/public/${job.id}`} draggable={false} className="group flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl ring-1 ring-stone-200 transition-all duration-200 group-hover:shadow-lg group-hover:shadow-violet-950/10 group-hover:ring-violet-400/30 dark:ring-white/5 dark:group-hover:shadow-violet-950/40">
        <ModelPreview src={job.preview_image_url} title={title} />
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

// Plain text row for the "Recent builds" popover — no preview/thumbnail
// fetch, just enough to recognize a build and jump to it.
function RecentBuildRow({ job, onNavigate }: { job: JobSummary; onNavigate: () => void }) {
  const title = job.title || job.job_type;
  return (
    <Link
      href={`/jobs/${job.id}`}
      draggable={false}
      onClick={onNavigate}
      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-stone-100 dark:hover:bg-white/5"
    >
      <span className="truncate text-stone-700 dark:text-zinc-300">{title}</span>
      <span className="flex shrink-0 items-center gap-2">
        <span className="text-xs text-stone-400">{new Date(job.created_at).toLocaleDateString()}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] ${
            job.status === "completed"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : job.status === "failed" || job.status === "cancelled"
                ? "bg-red-500/10 text-red-700 dark:text-red-400"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
          }`}
        >
          {job.status}
        </span>
      </span>
    </Link>
  );
}
