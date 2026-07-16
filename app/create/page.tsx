"use client";

import { useState } from "react";
import MeshViewer from "@/components/MeshViewer";

type GenerateResponse = {
  status: string;
  message: string;
};

export default function CreatePage() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as GenerateResponse;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-zinc-50 sm:text-4xl">
          Generate a NURBS model
        </h1>
        <p className="mt-3 text-zinc-400">
          Describe what you want to create and we&apos;ll turn it into a 3D
          model.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. a tall fluted ceramic vase with a narrow neck"
          rows={4}
          className="w-full resize-none rounded-xl border border-white/15 bg-zinc-900 px-4 py-3 text-zinc-50 placeholder:text-zinc-500 focus:border-violet-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!prompt.trim() || isLoading}
          className="self-center rounded-full bg-violet-500 px-8 py-3 font-semibold text-white transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Generating…" : "Generate"}
        </button>
      </form>

      {error && <p className="text-center text-sm text-red-400">{error}</p>}

      <div className="flex flex-col items-center gap-4">
        <div className="w-full max-w-md">
          <MeshViewer label="Your generated model will appear here" />
        </div>
        {result && (
          <p className="max-w-md text-center text-sm text-zinc-400">
            {result.message}
          </p>
        )}
      </div>
    </section>
  );
}
