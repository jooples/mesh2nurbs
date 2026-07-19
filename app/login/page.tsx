"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.push(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-zinc-50">Welcome back</h1>
        <p className="mt-2 text-sm text-zinc-400">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-400">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="rounded-xl border border-white/15 bg-zinc-900 px-4 py-3 text-zinc-50 placeholder:text-zinc-500 focus:border-violet-400 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-400">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="••••••••"
            className="rounded-xl border border-white/15 bg-zinc-900 px-4 py-3 text-zinc-50 placeholder:text-zinc-500 focus:border-violet-400 focus:outline-none"
          />
        </label>

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-center text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 rounded-full bg-violet-500 px-8 py-3 font-semibold text-white transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-400">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-violet-400 hover:text-violet-300">
          Create one
        </Link>
      </p>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-zinc-400">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
