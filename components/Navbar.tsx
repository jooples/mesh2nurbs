"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { creditsApi } from "@/lib/api";
import { useEffect, useState } from "react";

export default function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      creditsApi.getBalance().then((b) => setCredits(b.balance)).catch(() => {});
    }
  }, [isAuthenticated]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-sm font-semibold tracking-wide text-zinc-50">
          mesh2nurbs
        </Link>

        <div className="flex items-center gap-4 text-sm text-zinc-300">
          <Link href="/about" className="transition-colors hover:text-white">
            About
          </Link>
          <Link href="/gallery" className="transition-colors hover:text-white">
            Gallery
          </Link>

          {isLoading ? (
            <span className="h-8 w-20 animate-pulse rounded-full bg-zinc-800" />
          ) : isAuthenticated ? (
            <div className="flex items-center gap-3">
              {credits !== null && (
                <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
                  {credits} credits
                </span>
              )}
              <Link
                href="/create"
                className="rounded-full bg-white px-4 py-2 font-medium text-black transition-colors hover:bg-zinc-200"
              >
                Create
              </Link>
              <div className="relative group">
                <button className="flex items-center gap-1 rounded-full bg-zinc-800 px-3 py-2 text-xs transition-colors hover:bg-zinc-700">
                  {user?.display_name || user?.email?.split("@")[0] || "Account"}
                  <span className="ml-1 opacity-50">▾</span>
                </button>
                <div className="absolute right-0 top-full mt-1 hidden w-40 rounded-lg border border-white/10 bg-zinc-900 py-1 shadow-lg group-hover:block">
                  <Link
                    href="/create"
                    className="block px-4 py-2 text-xs hover:bg-white/5"
                  >
                    New Model
                  </Link>
                  {user?.is_admin && (
                    <Link
                      href="/admin"
                      className="block px-4 py-2 text-xs text-violet-400 hover:bg-white/5"
                    >
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="block w-full px-4 py-2 text-left text-xs text-red-400 hover:bg-white/5"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="transition-colors hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-violet-500 px-4 py-2 font-medium text-white transition-colors hover:bg-violet-400"
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
