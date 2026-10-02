"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Hero from "@/components/Hero";
import GalleryPreview from "@/components/GalleryPreview";
import WhyNurbs from "@/components/WhyNurbs";
import { useAuth } from "@/lib/auth";
import { useCredits } from "@/lib/credits";
import { jobsApi } from "@/lib/api";

const QUICK_ACTIONS = [
  {
    href: "/create",
    icon: "🆕",
    title: "New model",
    desc: "Generate from a prompt or image",
    badge: "bg-violet-500/10 dark:bg-violet-500/15",
    hover: "hover:border-violet-400/40 hover:shadow-violet-950/10 dark:hover:shadow-violet-950/40",
  },
  {
    href: "/gallery",
    icon: "🖼️",
    title: "Gallery",
    desc: "Browse and manage your models",
    badge: "bg-cyan-500/10 dark:bg-cyan-500/15",
    hover: "hover:border-cyan-400/40 hover:shadow-cyan-950/10 dark:hover:shadow-cyan-950/40",
  },
  {
    href: "/profile",
    icon: "👤",
    title: "Profile",
    desc: "Customize your name and avatar",
    badge: "bg-fuchsia-500/10 dark:bg-fuchsia-500/15",
    hover: "hover:border-fuchsia-400/40 hover:shadow-fuchsia-950/10 dark:hover:shadow-fuchsia-950/40",
  },
  {
    href: "/billing",
    icon: "💳",
    title: "Credits",
    desc: "Top up your balance",
    badge: "bg-amber-500/10 dark:bg-amber-500/15",
    hover: "hover:border-amber-400/40 hover:shadow-amber-950/10 dark:hover:shadow-amber-950/40",
  },
];

export default function Home() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { balance: credits } = useCredits();
  const [totalModels, setTotalModels] = useState<number | null>(null);
  const [completedModels, setCompletedModels] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([
      jobsApi.listJobs({ per_page: 1 }),
      jobsApi.listJobs({ per_page: 1, status: "completed" }),
    ])
      .then(([all, completed]) => {
        setTotalModels(all.total);
        setCompletedModels(completed.total);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  // Auth status is still resolving — hold on a neutral loading state rather
  // than guessing and flashing the wrong page for whichever way it turns out.
  if (authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  // Authenticated: show dashboard
  if (isAuthenticated) {
    return (
      <>
        <section className="relative border-b border-stone-200 px-6 py-10 dark:border-white/10">
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(50% 100% at 15% 0%, rgba(124,110,242,0.14), transparent 70%), radial-gradient(40% 100% at 85% 100%, rgba(34,211,238,0.08), transparent 70%)",
            }}
          />
          <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-stone-900 dark:bg-gradient-to-br dark:from-white dark:to-violet-200/80 dark:bg-clip-text dark:text-transparent">
                Welcome back{user?.display_name ? `, ${user.display_name}` : ""}
              </h1>
              <p className="mt-1 text-stone-500 dark:text-zinc-400">Generate 3D models from text or images.</p>
            </div>
            <Link
              href="/create"
              className="rounded-full bg-gradient-to-r from-violet-600 to-rose-400 px-6 py-3 font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-105 hover:shadow-violet-500/40"
            >
              New model
            </Link>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-10">
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-stone-200/70 bg-gradient-to-br from-violet-50 to-white p-4 text-center shadow-sm shadow-rose-900/[0.05] dark:border-white/10 dark:from-violet-500/[0.06] dark:to-zinc-900">
              <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/10 text-sm dark:bg-violet-500/15" aria-hidden>✨</div>
              <div className="text-2xl font-bold text-violet-700 dark:text-violet-300">{credits ?? "—"}</div>
              <div className="text-xs text-stone-500">credits</div>
            </div>
            <div className="rounded-xl border border-stone-200/70 bg-gradient-to-br from-cyan-50 to-white p-4 text-center shadow-sm shadow-rose-900/[0.05] dark:border-white/10 dark:from-cyan-500/[0.06] dark:to-zinc-900">
              <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/10 text-sm dark:bg-cyan-500/15" aria-hidden>🧊</div>
              <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">{totalModels ?? "—"}</div>
              <div className="text-xs text-stone-500">models</div>
            </div>
            <div className="rounded-xl border border-stone-200/70 bg-gradient-to-br from-emerald-50 to-white p-4 text-center shadow-sm shadow-rose-900/[0.05] dark:border-white/10 dark:from-emerald-500/[0.06] dark:to-zinc-900">
              <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-sm dark:bg-emerald-500/15" aria-hidden>✓</div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{completedModels ?? "—"}</div>
              <div className="text-xs text-stone-500">completed</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_ACTIONS.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className={`flex items-start gap-3 rounded-xl border border-stone-200/70 bg-white p-4 shadow-sm shadow-rose-900/[0.05] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-zinc-900/60 ${a.hover}`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${a.badge}`} aria-hidden>
                  {a.icon}
                </span>
                <div>
                  <p className="text-sm font-medium text-stone-900 dark:text-zinc-50">{a.title}</p>
                  <p className="text-xs text-stone-500">{a.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <WhyNurbs />

        <section className="mx-auto w-full max-w-6xl px-6 pb-14 text-center">
          <p className="text-stone-600 dark:text-zinc-400">
            Track your models, organize them into albums, and publish your favorites.
          </p>
          <Link
            href="/gallery"
            className="mt-4 inline-block rounded-full bg-gradient-to-r from-violet-600 to-rose-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-105 hover:shadow-violet-500/40"
          >
            Go to your gallery →
          </Link>
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
