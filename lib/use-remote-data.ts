"use client";

import { useEffect, useState } from "react";

/** Ignore responses from a previous query, including a previous signed-in user. */
export function useRemoteData<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>) {
  const [result, setResult] = useState<{ key: string; data?: T; error?: string } | null>(null);
  useEffect(() => {
    if (key === null) return;
    const controller = new AbortController();
    void load(controller.signal).then(
      (data) => { if (!controller.signal.aborted) setResult({ key, data }); },
      (error) => { if (!controller.signal.aborted) setResult({ key, error: error instanceof Error ? error.message : "Unable to load data." }); },
    );
    return () => controller.abort();
  }, [key, load]);
  return {
    data: key !== null && result?.key === key ? result.data : undefined,
    error: key !== null && result?.key === key ? result.error : undefined,
    loading: key !== null && result?.key !== key,
  };
}
