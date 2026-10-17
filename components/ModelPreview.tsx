"use client";

import { useState } from "react";

/** Gallery cards use images; the full 3D renderer belongs on the model page. */
export default function ModelPreview({ src, title }: { src?: string | null; title: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return <div className="flex aspect-square items-center justify-center bg-stone-100 dark:bg-zinc-900">
    {src && src !== failedUrl ? (
      // Signed storage URLs are already sized by the generation service.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={title} loading="lazy" decoding="async" onError={() => setFailedUrl(src)} className="h-full w-full object-contain" />
    ) : <div className="text-center text-stone-400"><span aria-hidden="true" className="text-5xl">◇</span><p className="mt-2 text-xs">Open 3D model</p></div>}
  </div>;
}
