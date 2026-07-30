"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, type AdminReportItem } from "@/lib/api";

const CATEGORY_LABEL: Record<string, string> = {
  bug: "🐞 Bug",
  feature: "💡 Feature",
  other: "💬 Other",
};

export default function AdminReportsPage() {
  const [items, setItems] = useState<AdminReportItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<"open" | "resolved" | "all">("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchReports = useCallback(async (status: "open" | "resolved" | "all") => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.listReports({
        status: status === "all" ? undefined : status,
        per_page: 50,
      });
      setItems(result.items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports(statusFilter);
  }, [statusFilter, fetchReports]);

  const toggleResolved = async (report: AdminReportItem) => {
    setUpdatingId(report.id);
    try {
      const next = report.status === "resolved" ? "open" : "resolved";
      await adminApi.updateReport(report.id, { status: next });
      setItems((prev) =>
        statusFilter === "all"
          ? prev.map((r) => (r.id === report.id ? { ...r, status: next } : r))
          : prev.filter((r) => r.id !== report.id)
      );
    } catch {
      // leave the list as-is; user can retry
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-stone-600 transition-colors hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-200">
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-3xl font-semibold text-stone-900 dark:text-zinc-50">
            Reports
          </h1>
        </div>
        <div className="flex gap-2">
          {(["open", "resolved", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                statusFilter === s
                  ? "border-violet-400/60 bg-violet-500/20 text-violet-800 dark:text-violet-200"
                  : "border-stone-200 bg-stone-100 text-stone-600 hover:text-stone-900 dark:border-white/10 dark:bg-black/20 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-50 p-4 text-center text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-16 text-center text-sm text-stone-500">No {statusFilter !== "all" ? statusFilter : ""} reports.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((report) => (
            <div
              key={report.id}
              className="rounded-xl border border-stone-200/70 bg-white p-5 shadow-sm shadow-rose-900/[0.05] dark:border-white/10 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm">{CATEGORY_LABEL[report.category] || report.category}</span>
                    <h3 className="truncate font-medium text-stone-900 dark:text-zinc-50">{report.title}</h3>
                    {report.status === "resolved" && (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                        Resolved
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-stone-600 dark:text-zinc-400">
                    {report.description}
                  </p>
                  <p className="mt-2 text-xs text-stone-500">
                    {report.reporter_email}
                    {report.created_at && ` · ${new Date(report.created_at).toLocaleString()}`}
                    {report.page_url && (
                      <>
                        {" · "}
                        <a href={report.page_url} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300">
                          page
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => toggleResolved(report)}
                  disabled={updatingId === report.id}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                    report.status === "resolved"
                      ? "border-stone-200 bg-stone-100 text-stone-600 hover:text-stone-900 dark:border-white/10 dark:bg-black/20 dark:text-zinc-400 dark:hover:text-zinc-200"
                      : "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                  }`}
                >
                  {updatingId === report.id ? "…" : report.status === "resolved" ? "Reopen" : "Mark resolved"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
