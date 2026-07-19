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
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-lg border border-red-500/30 bg-red-950/30 p-4 text-center text-sm text-red-400">
          Failed to load stats: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-50">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-400">
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
              className="h-28 animate-pulse rounded-xl bg-zinc-900"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Users" value={stats.total_users} />
            <StatCard
              label="Active Users"
              value={stats.active_users}
              subtitle={`${stats.admin_users} admins`}
            />
            <StatCard
              label="Jobs"
              value={stats.total_jobs}
              subtitle={`${stats.completed_jobs} completed, ${stats.failed_jobs} failed`}
            />
            <StatCard
              label="Credits Consumed"
              value={stats.total_credits_consumed.toLocaleString()}
              subtitle={`${stats.total_credits_granted.toLocaleString()} granted`}
            />
          </div>

          {/* Quick links */}
          <div className="mt-12">
            <h2 className="mb-4 text-lg font-medium text-zinc-200">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Link
                href="/admin/users"
                className="flex items-center gap-4 rounded-xl border border-white/10 bg-zinc-900 p-5 transition-colors hover:bg-zinc-800"
              >
                <span className="text-2xl">👥</span>
                <div>
                  <p className="font-medium text-zinc-200">User Management</p>
                  <p className="text-sm text-zinc-400">
                    View users, adjust credits, manage accounts
                  </p>
                </div>
              </Link>
              <Link
                href="/create"
                className="flex items-center gap-4 rounded-xl border border-white/10 bg-zinc-900 p-5 transition-colors hover:bg-zinc-800"
              >
                <span className="text-2xl">🆕</span>
                <div>
                  <p className="font-medium text-zinc-200">Create Model</p>
                  <p className="text-sm text-zinc-400">
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

function StatCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900 p-6">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-zinc-50">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}
    </div>
  );
}
