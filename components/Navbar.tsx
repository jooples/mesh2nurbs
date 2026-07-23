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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/70 backdrop-blur-md">
      {/* thin neon rule along the bottom edge */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="bg-gradient-to-r from-zinc-50 to-violet-300 bg-clip-text text-sm font-semibold tracking-wide text-transparent transition-opacity hover:opacity-80"
        >
          mesh2nurbs
        </Link>

        <div className="flex items-center gap-4 text-sm text-zinc-400">
          {navLinks.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`relative transition-colors ${
                  isActive ? "text-violet-300" : "hover:text-white"
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
            <span className="h-8 w-20 animate-pulse rounded-full bg-zinc-800" />
          ) : isAuthenticated ? (
            <div className="flex items-center gap-3">
              {credits !== null && (
                <Link
                  href="/billing"
                  className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-300 transition-colors hover:border-violet-400/40 hover:bg-violet-500/20"
                >
                  {credits} credits
                </Link>
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
                <div className="absolute right-0 top-full hidden w-40 pt-1 group-hover:block">
                  <div className="rounded-lg border border-white/10 bg-zinc-900 py-1 shadow-lg">
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
                className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 font-medium text-white shadow-md shadow-violet-500/25 transition-all hover:shadow-lg hover:shadow-violet-500/40"
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
