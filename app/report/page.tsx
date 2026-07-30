"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { reportsApi } from "@/lib/api";

const CATEGORIES = [
  { value: "bug", label: "🐞 Bug", desc: "Something is broken or not working as expected" },
  { value: "feature", label: "💡 Feature request", desc: "Something you wish Geonesis could do" },
  { value: "other", label: "💬 Other", desc: "Anything else" },
];

export default function ReportPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [category, setCategory] = useState("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/report");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await reportsApi.create({
        category,
        title: title.trim(),
        description: description.trim(),
        page_url: typeof window !== "undefined" ? window.location.href : undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  if (submitted) {
    return (
      <section className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-2xl dark:bg-emerald-500/15" aria-hidden>✓</div>
        <h1 className="text-xl font-semibold text-stone-900 dark:text-zinc-50">Thanks — we got it</h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-zinc-400">
          Your report has been submitted. We read every one.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setTitle("");
            setDescription("");
          }}
          className="mt-6 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
        >
          Submit another report
        </button>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-stone-900 dark:bg-gradient-to-br dark:from-white dark:to-violet-200 dark:bg-clip-text dark:text-transparent">
          Report an issue
        </h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-zinc-400">
          Found a bug, or have an idea? Let us know.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              title={c.desc}
              className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                category === c.value
                  ? "border-violet-400/60 bg-violet-500/20 text-violet-800 dark:text-violet-200"
                  : "border-stone-300 bg-white text-stone-700 hover:border-violet-400/30 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-300"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-600 dark:text-zinc-400">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            placeholder="Short summary"
            className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-600 dark:text-zinc-400">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            maxLength={5000}
            rows={5}
            placeholder="What happened? What did you expect instead?"
            className="resize-none rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
        </label>

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-50 p-3 text-center text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-full bg-gradient-to-r from-violet-600 to-rose-400 px-8 py-3 font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-105 hover:shadow-xl hover:shadow-violet-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          {submitting ? "Submitting…" : "Submit report"}
        </button>
      </form>
    </section>
  );
}
