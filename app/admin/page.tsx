"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, type AdminStats } from "@/lib/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .getStats()
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-lg border border-red-500/30 bg-red-50 p-4 text-center text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          Failed to load stats: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-stone-900 dark:text-zinc-50">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-zinc-400">
            Platform overview and user management
          </p>
        </div>
        <Link
          href="/admin/users"
          className="rounded-full bg-violet-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-400"
        >
          Manage Users
        </Link>
      </div>

      {!stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl bg-stone-200 dark:bg-zinc-900"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Users" value={stats.total_users} icon="👥" color="violet" />
            <StatCard
              label="Active Users"
              value={stats.active_users}
              subtitle={`${stats.admin_users} admins`}
              icon="🟢"
              color="cyan"
            />
            <StatCard
              label="Jobs"
              value={stats.total_jobs}
              subtitle={`${stats.completed_jobs} completed, ${stats.failed_jobs} failed`}
              icon="🧊"
              color="fuchsia"
            />
            <StatCard
              label="Credits Consumed"
              value={stats.total_credits_consumed.toLocaleString()}
              subtitle={`${stats.total_credits_granted.toLocaleString()} granted`}
              icon="✨"
              color="amber"
            />
          </div>

          {/* Quick links */}
          <div className="mt-12">
            <h2 className="mb-4 text-lg font-medium text-stone-800 dark:text-zinc-200">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Link
                href="/admin/users"
                className="flex items-center gap-4 rounded-xl border border-stone-200/70 bg-white shadow-sm shadow-rose-900/[0.05] p-5 transition-all hover:-translate-y-0.5 hover:border-violet-400/40 hover:shadow-lg dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-xl dark:bg-violet-500/15" aria-hidden>👥</span>
                <div>
                  <p className="font-medium text-stone-800 dark:text-zinc-200">User Management</p>
                  <p className="text-sm text-stone-600 dark:text-zinc-400">
                    View users, adjust credits, manage accounts
                  </p>
                </div>
              </Link>
              <Link
                href="/admin/reports"
                className="flex items-center gap-4 rounded-xl border border-stone-200/70 bg-white shadow-sm shadow-rose-900/[0.05] p-5 transition-all hover:-translate-y-0.5 hover:border-fuchsia-400/40 hover:shadow-lg dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/10 text-xl dark:bg-fuchsia-500/15" aria-hidden>📮</span>
                <div>
                  <p className="font-medium text-stone-800 dark:text-zinc-200">Reports</p>
                  <p className="text-sm text-stone-600 dark:text-zinc-400">
                    Review bug reports and feedback
                  </p>
                </div>
              </Link>
              <Link
                href="/create"
                className="flex items-center gap-4 rounded-xl border border-stone-200/70 bg-white shadow-sm shadow-rose-900/[0.05] p-5 transition-all hover:-translate-y-0.5 hover:border-cyan-400/40 hover:shadow-lg dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-xl dark:bg-cyan-500/15" aria-hidden>🆕</span>
                <div>
                  <p className="font-medium text-stone-800 dark:text-zinc-200">Create Model</p>
                  <p className="text-sm text-stone-600 dark:text-zinc-400">
                    Generate a new 3D model
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const STAT_COLORS = {
  violet: { bg: "bg-gradient-to-br from-violet-50 to-white dark:from-violet-500/[0.06] dark:to-zinc-900", badge: "bg-violet-500/10 dark:bg-violet-500/15", value: "text-violet-700 dark:text-violet-300" },
  cyan: { bg: "bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-500/[0.06] dark:to-zinc-900", badge: "bg-cyan-500/10 dark:bg-cyan-500/15", value: "text-cyan-700 dark:text-cyan-300" },
  fuchsia: { bg: "bg-gradient-to-br from-fuchsia-50 to-white dark:from-fuchsia-500/[0.06] dark:to-zinc-900", badge: "bg-fuchsia-500/10 dark:bg-fuchsia-500/15", value: "text-fuchsia-700 dark:text-fuchsia-300" },
  amber: { bg: "bg-gradient-to-br from-amber-50 to-white dark:from-amber-500/[0.06] dark:to-zinc-900", badge: "bg-amber-500/10 dark:bg-amber-500/15", value: "text-amber-700 dark:text-amber-300" },
} as const;

function StatCard({
  label,
  value,
  subtitle,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: keyof typeof STAT_COLORS;
}) {
  const c = STAT_COLORS[color];
  return (
    <div className={`rounded-xl border border-stone-200/70 shadow-sm shadow-rose-900/[0.05] p-6 dark:border-white/10 ${c.bg}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm text-stone-600 dark:text-zinc-400">{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${c.badge}`} aria-hidden>{icon}</span>
      </div>
      <p className={`text-3xl font-semibold ${c.value}`}>{value}</p>
      {subtitle && <p className="mt-1 text-xs text-stone-500">{subtitle}</p>}
    </div>
  );
}
