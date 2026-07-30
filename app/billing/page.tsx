"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useCredits } from "@/lib/credits";
import { creditsApi } from "@/lib/api";

const QUICK_AMOUNTS = [10, 50, 200, 1000];

export default function BillingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { balance, setBalance } = useCredits();
  const [amount, setAmount] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/billing");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleTopUp = async () => {
    if (isSubmitting || amount <= 0) return;
    setIsSubmitting(true);
    setError(null);
    setJustAdded(null);
    try {
      const result = await creditsApi.topUp(amount);
      setBalance(result.balance);
      setJustAdded(amount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Top-up failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-stone-900 dark:bg-gradient-to-br dark:from-white dark:to-violet-200 dark:bg-clip-text dark:text-transparent">
          Add credits
        </h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-zinc-400">
          {balance !== null ? `Current balance: ${balance} credits` : "Loading balance…"}
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-500/5 p-4 text-center text-xs text-amber-700 dark:text-amber-300">
        Testing mode — top-ups here are free and instant, no payment is
        collected. This will be replaced with a real paid checkout before
        launch.
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setAmount(n)}
              className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                amount === n
                  ? "border-violet-400/60 bg-violet-500/20 text-violet-800 dark:text-violet-200"
                  : "border-stone-300 bg-white text-stone-700 hover:border-violet-400/30 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-300"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-600 dark:text-zinc-400">Custom amount</span>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
        </label>

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-50 p-3 text-center text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </p>
        )}

        {justAdded !== null && !error && (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-50 p-3 text-center text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            Added {justAdded} credits.
          </p>
        )}

        <button
          type="button"
          onClick={handleTopUp}
          disabled={isSubmitting || amount <= 0}
          className="mt-2 rounded-full bg-gradient-to-r from-violet-600 to-rose-400 px-8 py-3 font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {isSubmitting ? "Adding…" : `Add ${amount} credits`}
        </button>
      </div>
    </section>
  );
}
