"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useCredits } from "@/lib/credits";
import { RetryableRequest } from "@/lib/retryable-request";
import {
  adminApi,
  type AdminUserDetail,
  type CreditTransactionItem,
  type PaginatedResponse,
} from "@/lib/api";

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params.id as string;
  return <AdminUserDetailContent key={userId} userId={userId} />;
}

function AdminUserDetailContent({ userId }: { userId: string }) {
  const { user: currentUser } = useAuth();
  const { refreshCredits } = useCredits();
  const adjustmentRequest = useRef(new RetryableRequest());
  const submitLock = useRef(false);

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [transactions, setTransactions] =
    useState<PaginatedResponse<CreditTransactionItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Credit adjustment form
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [adjustResult, setAdjustResult] = useState<string | null>(null);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      adminApi.getUser(userId),
      adminApi.getUserTransactions(userId, { per_page: 20 }),
    ])
      .then(([u, t]) => {
        if (cancelled) return;
        setUser(u);
        setTransactions(t);
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLock.current || user?.id !== userId) return;
    const num = Number(amount);
    if (!Number.isSafeInteger(num) || num === 0) {
      setAdjustError("Please enter a valid non-zero amount");
      return;
    }
    if (!reason.trim()) {
      setAdjustError("Please provide a reason");
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    setAdjustError(null);
    setAdjustResult(null);

    try {
      const result = await adminApi.adjustCredits(userId, num, reason.trim(), adjustmentRequest.current.keyFor({ userId, amount: num, reason: reason.trim() }));
      adjustmentRequest.current.complete();
      setAdjustResult(
        `Credits adjusted: ${result.previous_balance} → ${result.new_balance} (${result.adjustment > 0 ? "+" : ""}${result.adjustment})`
      );
      setAmount("");
      setReason("");
      if (currentUser?.id === userId) await refreshCredits();
      // Refresh user data
      try {
        const [u, t] = await Promise.all([
          adminApi.getUser(userId),
          adminApi.getUserTransactions(userId, { per_page: 20 }),
        ]);
        setUser(u);
        setTransactions(t);
      } catch {
        setAdjustResult((message) => `${message} — Saved successfully. Refresh this page to see the updated balance and history.`);
      }
    } catch (e: unknown) {
      setAdjustError(e instanceof Error ? e.message : "Failed to adjust credits");
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-lg border border-red-500/30 bg-red-50 p-4 text-center text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {error || "User not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Breadcrumb */}
      <Link
        href="/admin/users"
        className="text-sm text-stone-600 dark:text-zinc-400 transition-colors hover:text-stone-900 dark:hover:text-zinc-200"
      >
        ← Back to Users
      </Link>

      {/* User info card */}
      <div className="mt-4 rounded-xl border border-stone-200/70 bg-white shadow-sm shadow-rose-900/[0.05] p-6 dark:border-white/10 dark:bg-zinc-900">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900 dark:text-zinc-50">
              {user.display_name || user.email.split("@")[0]}
            </h1>
            <p className="text-sm text-stone-600 dark:text-zinc-400">{user.email}</p>
          </div>
          <div className="flex gap-2">
            {user.is_admin && (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                Admin
              </span>
            )}
            {!user.is_active && (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
                Inactive
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Credits" value={user.credits_balance} />
          <Stat label="Lifetime Used" value={user.lifetime_used} />
          <Stat label="Total Jobs" value={user.total_jobs} />
          <Stat label="Completed" value={user.completed_jobs} />
        </div>

        <div className="mt-4 text-xs text-stone-500">
          Joined:{" "}
          {user.created_at
            ? new Date(user.created_at).toLocaleDateString()
            : "—"}
          {user.last_login_at &&
            ` · Last login: ${new Date(user.last_login_at).toLocaleDateString()}`}
        </div>
      </div>

      {/* Credit adjustment */}
      <div className="mt-6 rounded-xl border border-stone-200/70 bg-white shadow-sm shadow-rose-900/[0.05] p-6 dark:border-white/10 dark:bg-zinc-900">
        <h2 className="text-lg font-medium text-stone-800 dark:text-zinc-200">Adjust Credits</h2>
        <form onSubmit={handleAdjust} className="mt-4 space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-stone-500">Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 20 or -10"
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-violet-400 focus:outline-none dark:border-white/15 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500"
              />
              <p className="mt-1 text-xs text-stone-500">
                Positive = grant, negative = deduct. Current balance:{" "}
                {user.credits_balance}
              </p>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-stone-500">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you adjusting these credits?"
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-violet-400 focus:outline-none dark:border-white/15 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500"
            />
          </div>

          {adjustError && (
            <div className="rounded-lg border border-red-500/30 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
              {adjustError}
            </div>
          )}
          {adjustResult && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
              {adjustResult}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-violet-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-400 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Apply Adjustment"}
          </button>
        </form>
      </div>

      {/* Transaction history */}
      <div className="mt-6 rounded-xl border border-stone-200/70 bg-white shadow-sm shadow-rose-900/[0.05] p-6 dark:border-white/10 dark:bg-zinc-900">
        <h2 className="text-lg font-medium text-stone-800 dark:text-zinc-200">
          Credit Transactions
        </h2>
        {transactions && transactions.items.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 dark:border-white/10">
                <tr>
                  <th className="px-3 py-2 font-medium text-stone-600 dark:text-zinc-400">Type</th>
                  <th className="px-3 py-2 text-right font-medium text-stone-600 dark:text-zinc-400">
                    Amount
                  </th>
                  <th className="px-3 py-2 font-medium text-stone-600 dark:text-zinc-400">Note</th>
                  <th className="px-3 py-2 text-right font-medium text-stone-600 dark:text-zinc-400">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-white/5">
                {transactions.items.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          tx.amount > 0
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                        }`}
                      >
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-mono ${
                        tx.amount > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
                      }`}
                    >
                      {tx.amount > 0 ? "+" : ""}
                      {tx.amount}
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2 text-stone-600 dark:text-zinc-400">
                      {tx.description || "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-stone-500">
                      {tx.created_at
                        ? new Date(tx.created_at).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-stone-500">No transactions yet.</p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-100 p-3 dark:border-white/5 dark:bg-zinc-800/50">
      <p className="text-xs text-stone-600 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-stone-900 dark:text-zinc-50">{value}</p>
    </div>
  );
}
