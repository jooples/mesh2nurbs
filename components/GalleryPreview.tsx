"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ModelPreview from "@/components/ModelPreview";
import { jobsApi, type JobSummary } from "@/lib/api";

export default function GalleryPreview() {
  const [models, setModels] = useState<JobSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    jobsApi
      .listPublicJobs({ per_page: 3 })
      .then((data) => {
        if (!cancelled) setModels(data.items);
      })
      .catch((err) => console.error("Failed to load public gallery preview:", err))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-14">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <h2 className="text-3xl font-semibold text-stone-900 dark:bg-gradient-to-br dark:from-white dark:to-cyan-200/80 dark:bg-clip-text dark:text-transparent">
          See what Geonesis can build
        </h2>
        <p className="max-w-xl text-stone-600 dark:text-zinc-400">
          Models the community has published to the public gallery.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      ) : models.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-stone-600 dark:text-zinc-400">No public models yet — be the first to publish one.</p>
          <Link
            href="/create"
            className="mt-4 inline-block rounded-full bg-gradient-to-r from-violet-600 to-rose-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-105 hover:shadow-violet-500/40"
          >
            Create a model
          </Link>
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
              <div className="overflow-hidden rounded-2xl ring-1 ring-stone-200 transition-all duration-200 group-hover:shadow-lg group-hover:shadow-violet-950/10 group-hover:ring-violet-400/30 dark:ring-white/5 dark:group-hover:shadow-violet-950/40">
                <ModelPreview src={model.preview_image_url} title={model.title || model.job_type} />
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

      <div className="mt-8 flex justify-center">
        <Link
          href="/gallery?tab=public"
          className="rounded-full border border-stone-300 px-6 py-3 text-sm font-medium text-stone-700 transition-colors hover:border-cyan-500/50 hover:bg-stone-100 hover:text-stone-900 dark:border-white/15 dark:text-zinc-100 dark:hover:border-cyan-400/40 dark:hover:bg-white/5 dark:hover:text-white"
        >
          View full gallery
        </Link>
      </div>
    </section>
  );
}
