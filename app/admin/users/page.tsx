"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { adminApi, type AdminUserItem, type PaginatedResponse } from "@/lib/api";

export default function AdminUserList() {
  const [data, setData] = useState<PaginatedResponse<AdminUserItem> | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async (p: number, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.listUsers({ page: p, search: q || undefined, per_page: 20 });
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(page, search);
  }, [page, fetchUsers]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers(1, search);
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link
            href="/admin"
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-3xl font-semibold text-zinc-50">
            User Management
          </h1>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email or display name..."
          className="flex-1 rounded-xl border border-white/15 bg-zinc-900 px-4 py-3 text-sm text-zinc-50 placeholder:text-zinc-500 focus:border-violet-400 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-full bg-violet-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-violet-400"
        >
          Search
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-950/30 p-4 text-center text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-zinc-900/50">
            <tr>
              <th className="px-4 py-3 font-medium text-zinc-300">Email</th>
              <th className="px-4 py-3 font-medium text-zinc-300">Name</th>
              <th className="px-4 py-3 font-medium text-zinc-300">Role</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-300">Credits</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-300">Jobs</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-300">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data && data.items.length > 0 ? (
              data.items.map((u) => (
                <tr
                  key={u.id}
                  className="transition-colors hover:bg-zinc-900/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="font-medium text-violet-400 transition-colors hover:text-violet-300"
                    >
                      {u.email}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {u.display_name || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_admin ? (
                      <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-xs text-violet-300">
                        Admin
                      </span>
                    ) : (
                      <span className="text-zinc-500">User</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-mono text-sm ${
                        u.credits_balance < 20 ? "text-red-400" : "text-zinc-200"
                      }`}
                    >
                      {u.credits_balance}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-400">
                    {u.total_jobs}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-500">
                    {u.created_at
                      ? new Date(u.created_at).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-zinc-500"
                >
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          <p className="text-zinc-400">
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} of{" "}
            {data.total} users
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-full border border-white/15 px-4 py-2 text-zinc-300 transition-colors hover:bg-white/10 disabled:opacity-30"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
              disabled={page >= data.total_pages}
              className="rounded-full border border-white/15 px-4 py-2 text-zinc-300 transition-colors hover:bg-white/10 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
