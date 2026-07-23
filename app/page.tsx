"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Hero from "@/components/Hero";
import GalleryPreview from "@/components/GalleryPreview";
import WhyNurbs from "@/components/WhyNurbs";
import { useAuth } from "@/lib/auth";
import { useCredits } from "@/lib/credits";
import { jobsApi, type JobSummary } from "@/lib/api";

export default function Home() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { balance: credits } = useCredits();
  const [recentJobs, setRecentJobs] = useState<JobSummary[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { setDashboardLoading(false); return; }
    async function load() {
      try {
        const j = await jobsApi.listJobs({ per_page: 6 });
        setRecentJobs(j.items);
      } catch { /* dashboard is non-critical */ }
      finally { setDashboardLoading(false); }
    }
    load();
  }, [isAuthenticated]);

  // Authenticated: show dashboard
  if (isAuthenticated && !authLoading && !dashboardLoading) {
    return (
      <>
        <section className="relative border-b border-white/10 px-6 py-10">
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(50% 100% at 15% 0%, rgba(124,110,242,0.14), transparent 70%), radial-gradient(40% 100% at 85% 100%, rgba(34,211,238,0.08), transparent 70%)",
            }}
          />
          <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="bg-gradient-to-br from-white to-violet-200/80 bg-clip-text text-2xl font-semibold text-transparent">
                Welcome back{user?.display_name ? `, ${user.display_name}` : ""}
              </h1>
              <p className="mt-1 text-zinc-400">Generate 3D models from text or images.</p>
            </div>
            <div className="flex items-center gap-4">
              {credits !== null && (
                <div className="rounded-xl border border-violet-400/20 bg-violet-500/5 px-5 py-3 text-center">
                  <div className="text-2xl font-bold text-violet-300">{credits}</div>
                  <div className="text-xs text-zinc-500">credits</div>
                </div>
              )}
              <Link
                href="/create"
                className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-105 hover:shadow-violet-500/40"
              >
                New model
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-zinc-50">Recent models</h2>
            {recentJobs.length > 0 && (
              <Link href="/gallery" className="text-sm text-violet-400 hover:text-violet-300">View all →</Link>
            )}
          </div>
          {recentJobs.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-zinc-500">No models yet. Create your first one!</p>
              <Link href="/create" className="mt-4 inline-block rounded-full bg-zinc-800 px-6 py-3 text-sm text-zinc-200 transition-colors hover:bg-zinc-700">Get started →</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {recentJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="group rounded-xl border border-white/5 bg-zinc-900/60 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-400/30 hover:shadow-lg hover:shadow-violet-950/40"
                >
                  <RecentModelThumb job={job} />
                  <p className="truncate text-xs text-zinc-400 group-hover:text-zinc-200">{job.title || job.job_type}</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] ${job.status === "completed" ? "bg-emerald-500/10 text-emerald-400" : job.status === "failed" || job.status === "cancelled" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}>{job.status}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </>
    );
  }

  // Unauthenticated: show landing page
  return (
    <>
      <Hero />
      <GalleryPreview />
      <WhyNurbs />
    </>
  );
}

// Thumbnail for the homepage's recent-models grid. Renders a flat 2D preview
// image instead of a 3D viewer — this grid can show many cards at once, and
// spinning up a WebGL canvas per card is unnecessary here. Falls back to a
// status placeholder while processing or if generation failed.
function RecentModelThumb({ job }: { job: JobSummary }) {
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

  if (job.status === "failed" || job.status === "cancelled") {
    return (
      <div className="mb-2 flex aspect-square items-center justify-center rounded-lg border border-red-500/10 bg-red-950/20">
        <span className="text-xl" aria-hidden>⚠️</span>
      </div>
    );
  }

  if (job.status !== "completed") {
    return (
      <div className="mb-2 flex aspect-square items-center justify-center rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
      </div>
    );
  }

  if (previewUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={previewUrl}
        alt=""
        className="mb-2 aspect-square w-full rounded-lg bg-zinc-900 object-cover"
      />
    );
  }

  return (
    <div className="mb-2 flex aspect-square items-center justify-center rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-600">
      <span className="text-xl" aria-hidden>🧊</span>
    </div>
  );
}
