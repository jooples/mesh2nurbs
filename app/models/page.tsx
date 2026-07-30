"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MeshViewer from "@/components/MeshViewer";
import { jobsApi, type JobSummary } from "@/lib/api";

// Community showcase — every model anyone has chosen to publish, browsable
// without signing in. The gallery's "Public Gallery" tab shows the same
// data, but this is the shareable, no-auth-required front door for it.
export default function ModelsPage() {
  const [models, setModels] = useState<JobSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    jobsApi
      .listPublicJobs({ per_page: 60, search: debouncedSearch || undefined })
      .then((data) => setModels(data.items))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setIsLoading(false));
  }, [debouncedSearch]);

  return (
    <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold text-stone-900 sm:text-4xl dark:bg-gradient-to-br dark:from-white dark:to-violet-200/80 dark:bg-clip-text dark:text-transparent">
          Public models
        </h1>
        <p className="mt-3 text-stone-600 dark:text-zinc-400">
          Every model the community has published to Geonesis, browsable without signing in.
        </p>
      </div>

      <div className="mx-auto mb-10 max-w-sm">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search public models…"
          className="w-full rounded-full border border-stone-200 bg-stone-100 px-4 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-violet-400/50 dark:border-white/10 dark:bg-black/20 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      ) : error ? (
        <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : models.length === 0 ? (
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
          {models.map((model) => (
            <Link
              key={model.id}
              href={`/gallery/public/${model.id}`}
              draggable={false}
              className="group flex flex-col gap-3"
            >
              <div className="overflow-hidden rounded-2xl ring-1 ring-stone-200 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:shadow-violet-950/10 group-hover:ring-violet-400/30 dark:ring-white/5 dark:group-hover:shadow-violet-950/40">
                <MeshViewer
                  modelUrl={model.glb_url ?? undefined}
                  previewUrl={model.preview_image_url ?? undefined}
                />
              </div>
              <div>
                <h3 className="truncate text-sm font-semibold text-stone-900 transition-colors group-hover:text-violet-600 dark:text-zinc-50 dark:group-hover:text-violet-300">
                  {model.title || model.job_type}
                </h3>
                <p className="mt-0.5 text-xs text-stone-500">
                  by {model.publisher_name || "Anonymous"} · {new Date(model.created_at).toLocaleDateString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
