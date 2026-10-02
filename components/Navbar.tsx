"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useCredits } from "@/lib/credits";

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/gallery", label: "Gallery" },
  { href: "/nurbs", label: "NURBS Viewer" },
];

export default function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const { balance: credits } = useCredits();

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/70 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/70">
      {/* thin neon rule along the bottom edge */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-sm font-semibold tracking-wide text-stone-900 transition-opacity hover:opacity-80 dark:bg-gradient-to-r dark:from-zinc-50 dark:to-violet-300 dark:bg-clip-text dark:text-transparent"
        >
          Geonesis
        </Link>

        <div className="flex items-center gap-4 text-sm text-stone-500 dark:text-zinc-400">
          {navLinks.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`relative transition-colors ${
                  isActive
                    ? "text-violet-600 dark:text-violet-300"
                    : "hover:text-stone-900 dark:hover:text-white"
                }`}
              >
                {label}
                {isActive && (
                  <span className="absolute -bottom-1.5 left-0 h-px w-full bg-violet-400/70" />
                )}
              </Link>
            );
          })}

          {isLoading ? (
            <span className="h-8 w-20 animate-pulse rounded-full bg-stone-200 dark:bg-zinc-800" />
          ) : isAuthenticated ? (
            <div className="flex items-center gap-3">
              {credits !== null && (
                <Link
                  href="/billing"
                  className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-700 transition-colors hover:border-violet-400/50 hover:bg-violet-500/20 dark:border-violet-400/20 dark:text-violet-300 dark:hover:border-violet-400/40"
                >
                  {credits} credits
                </Link>
              )}
              <Link
                href="/create"
                className="rounded-full bg-stone-900 px-4 py-2 font-medium text-white transition-colors hover:bg-stone-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                Create
              </Link>
              <div className="relative group">
                <button className="flex items-center gap-1 rounded-full bg-stone-200 px-3 py-2 text-xs text-stone-700 transition-colors hover:bg-stone-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
                  {user?.display_name || user?.email?.split("@")[0] || "Account"}
                  <span className="ml-1 opacity-50">▾</span>
                </button>
                <div className="absolute right-0 top-full hidden w-40 pt-1 group-hover:block">
                  <div className="rounded-lg border border-stone-200/70 bg-white py-1 shadow-lg shadow-rose-900/[0.06] dark:border-white/10 dark:bg-zinc-900">
                    <Link
                      href="/create"
                      className="block px-4 py-2 text-xs text-stone-700 hover:bg-stone-100 dark:text-zinc-300 dark:hover:bg-white/5"
                    >
                      New Model
                    </Link>
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-xs text-stone-700 hover:bg-stone-100 dark:text-zinc-300 dark:hover:bg-white/5"
                    >
                      Profile
                    </Link>
                    {user?.is_admin && (
                      <Link
                        href="/admin"
                        className="block px-4 py-2 text-xs text-violet-600 hover:bg-stone-100 dark:text-violet-400 dark:hover:bg-white/5"
                      >
                        Admin Panel
                      </Link>
                    )}
                    <Link
                      href="/report"
                      className="block px-4 py-2 text-xs text-stone-700 hover:bg-stone-100 dark:text-zinc-300 dark:hover:bg-white/5"
                    >
                      Report an issue
                    </Link>
                    <button
                      onClick={logout}
                      className="block w-full px-4 py-2 text-left text-xs text-red-600 hover:bg-stone-100 dark:text-red-400 dark:hover:bg-white/5"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="transition-colors hover:text-stone-900 dark:hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-gradient-to-r from-violet-600 to-rose-400 px-4 py-2 font-medium text-white shadow-md shadow-violet-500/25 transition-all hover:shadow-lg hover:shadow-violet-500/40"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
