"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MeshViewer from "@/components/MeshViewer";
import { useAuth } from "@/lib/auth";
import { useCredits } from "@/lib/credits";
import { authApi, creditsApi, jobsApi, type JobSummary } from "@/lib/api";

function Avatar({ url, name, size = 20 }: { url: string | null | undefined; name: string; size?: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const dim = `${size * 0.25}rem`;
  return (
    <div className="relative shrink-0 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-400 to-rose-400 p-[3px] shadow-lg shadow-violet-500/25">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="rounded-full border-2 border-white object-cover dark:border-zinc-950"
          style={{ width: dim, height: dim }}
        />
      ) : (
        <div
          className="flex items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-violet-500 to-rose-400 font-semibold text-white dark:border-zinc-950"
          style={{ width: dim, height: dim, fontSize: `${size * 0.1}rem` }}
        >
          {initial}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();
  const { balance: credits } = useCredits();

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [completedJobs, setCompletedJobs] = useState(0);
  const [creditsUsed, setCreditsUsed] = useState<number | null>(null);
  const [jobsLoading, setJobsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/profile");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
      setAvatarUrl(user.avatar_url || "");
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setJobsLoading(true);
    Promise.all([
      jobsApi.listJobs({ per_page: 8 }),
      jobsApi.listJobs({ per_page: 1, status: "completed" }),
      creditsApi.getBalance(),
    ])
      .then(([all, completed, bal]) => {
        setJobs(all.items);
        setTotalJobs(all.total);
        setCompletedJobs(completed.total);
        setCreditsUsed(bal.lifetime_used);
      })
      .catch(() => {})
      .finally(() => setJobsLoading(false));
  }, [isAuthenticated]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaveMsg(null);
    setSaveError(null);
    try {
      await authApi.updateMe({ display_name: displayName, avatar_url: avatarUrl });
      await refreshUser();
      setSaveMsg("Profile updated.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !isAuthenticated || !user) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <div className="mb-8 flex items-center gap-4">
        <Avatar url={avatarUrl || user.avatar_url} name={displayName || user.email} size={20} />
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 dark:text-zinc-50">
            {user.display_name || user.email.split("@")[0]}
          </h1>
          <p className="text-sm text-stone-500">{user.email}</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-stone-200/70 bg-gradient-to-br from-violet-50 to-white p-4 text-center shadow-sm shadow-rose-900/[0.05] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-950/10 dark:border-white/10 dark:from-violet-500/[0.06] dark:to-zinc-900">
          <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/10 text-sm dark:bg-violet-500/15" aria-hidden>✨</div>
          <div className="text-2xl font-bold text-violet-700 dark:text-violet-300">{credits ?? "—"}</div>
          <div className="text-xs text-stone-500">credits</div>
        </div>
        <div className="rounded-xl border border-stone-200/70 bg-gradient-to-br from-amber-50 to-white p-4 text-center shadow-sm shadow-rose-900/[0.05] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-950/10 dark:border-white/10 dark:from-amber-500/[0.06] dark:to-zinc-900">
          <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-sm dark:bg-amber-500/15" aria-hidden>🔥</div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{creditsUsed ?? "—"}</div>
          <div className="text-xs text-stone-500">used</div>
        </div>
        <div className="rounded-xl border border-stone-200/70 bg-gradient-to-br from-cyan-50 to-white p-4 text-center shadow-sm shadow-rose-900/[0.05] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-950/10 dark:border-white/10 dark:from-cyan-500/[0.06] dark:to-zinc-900">
          <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/10 text-sm dark:bg-cyan-500/15" aria-hidden>🧊</div>
          <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">{totalJobs}</div>
          <div className="text-xs text-stone-500">models</div>
        </div>
        <div className="rounded-xl border border-stone-200/70 bg-gradient-to-br from-emerald-50 to-white p-4 text-center shadow-sm shadow-rose-900/[0.05] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-950/10 dark:border-white/10 dark:from-emerald-500/[0.06] dark:to-zinc-900">
          <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-sm dark:bg-emerald-500/15" aria-hidden>✓</div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{completedJobs}</div>
          <div className="text-xs text-stone-500">completed</div>
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="mb-10 rounded-2xl border border-stone-200/70 bg-white p-6 shadow-sm shadow-rose-900/[0.05] dark:border-white/10 dark:bg-zinc-900/40"
      >
        <h2 className="mb-4 flex items-center gap-2.5 text-lg font-medium text-stone-900 dark:text-zinc-50">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-500/10 text-sm dark:bg-fuchsia-500/15" aria-hidden>👤</span>
          Edit profile
        </h2>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-stone-600 dark:text-zinc-400">Display name</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={100}
              className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-stone-600 dark:text-zinc-400">Avatar URL (optional)</span>
            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
              className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
            />
            <span className="mt-1 text-xs text-stone-500">Leave blank to use your initial as an avatar.</span>
          </label>

          {saveError && (
            <p className="rounded-lg border border-red-500/30 bg-red-50 p-3 text-center text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
              {saveError}
            </p>
          )}
          {saveMsg && (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-50 p-3 text-center text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
              {saveMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="self-start rounded-full bg-gradient-to-r from-violet-600 to-rose-400 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-105 hover:shadow-xl hover:shadow-violet-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2.5 text-lg font-medium text-stone-900 dark:text-zinc-50">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/10 text-sm dark:bg-cyan-500/15" aria-hidden>🖼️</span>
          Your models
        </h2>
        {jobs.length > 0 && (
          <Link href="/gallery" className="text-sm font-medium text-violet-600 transition-colors hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300">
            View all →
          </Link>
        )}
      </div>
      {jobsLoading ? (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      ) : jobs.length === 0 ? (
        <p className="py-10 text-center text-sm text-stone-500">
          No models yet.{" "}
          <Link href="/create" className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300">
            Create your first one →
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`} draggable={false} className="group flex flex-col gap-1.5">
              <div className="overflow-hidden rounded-xl ring-1 ring-stone-200 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:shadow-violet-950/10 group-hover:ring-violet-400/40 dark:ring-white/5 dark:group-hover:shadow-violet-950/40">
                <MeshViewer
                  modelUrl={job.glb_url ?? undefined}
                  previewUrl={job.preview_image_url ?? undefined}
                />
              </div>
              <p className="truncate text-xs text-stone-600 group-hover:text-stone-900 dark:text-zinc-400 dark:group-hover:text-zinc-200">
                {job.title || job.job_type}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
