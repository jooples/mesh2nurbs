"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

type TabType = "text" | "image";

type Params = {
  face_count: number;
  generate_type: "Normal" | "LowPoly" | "Geometry" | "Sketch";
  enable_pbr: boolean;
  polygon_type: "triangle" | "quadrilateral";
};

const DEFAULT_PARAMS: Params = {
  face_count: 500000,
  generate_type: "Normal",
  enable_pbr: false,
  polygon_type: "triangle",
};

export default function CreatePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>("text");
  const [prompt, setPrompt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageDrop = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) {
      setError("Image must be under 16MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
  }, []);

  const getToken = () => localStorage.getItem("access_token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (activeTab === "text" && !prompt.trim()) return;
    if (activeTab === "image" && !imageFile) return;
    if (!isAuthenticated) {
      router.push("/login?redirect=/create");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = getToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };

      let res: Response;

      if (activeTab === "text") {
        res = await fetch(`${API_BASE}/jobs/text-to-3d`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            params: {
              prompt: prompt.trim(),
              ...(params.enable_pbr !== undefined && { enable_pbr: params.enable_pbr }),
              ...(params.face_count && { face_count: params.face_count }),
              ...(params.generate_type && { generate_type: params.generate_type }),
              ...(params.polygon_type && { polygon_type: params.polygon_type }),
            },
          }),
        });
      } else {
        const formData = new FormData();
        formData.append("image", imageFile!);
        if (prompt.trim()) formData.append("prompt", prompt.trim());
        formData.append("enable_pbr", String(params.enable_pbr));
        formData.append("face_count", String(params.face_count));
        formData.append("generate_type", params.generate_type);
        formData.append("polygon_type", params.polygon_type);

        res = await fetch(`${API_BASE}/jobs/image-to-3d`, {
          method: "POST",
          headers: { Authorization: headers.Authorization },
          body: formData,
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { detail?: string }).detail || `Submit failed (${res.status})`);
      }

      const { id: jobId } = await res.json();
      // Redirect to job detail page — status is polled there in real time
      router.push(`/jobs/${jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="text-center">
        <h1 className="bg-gradient-to-br from-white to-violet-200 bg-clip-text text-3xl font-semibold text-transparent sm:text-4xl">
          Generate a 3D model
        </h1>
        <p className="mt-3 text-zinc-400">
          Describe what you want to create and we&apos;ll turn it into a 3D model.
        </p>
        {!isAuthenticated && (
          <p className="mt-2 text-sm text-amber-400">
            You&apos;ll need to log in before generating a model.
          </p>
        )}
      </div>

      {/* Tab selector */}
      <div className="flex justify-center gap-2">
        {(["text", "image"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/20"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {tab === "text" ? "Text to 3D" : "Image to 3D"}
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {activeTab === "text" ? (
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. A tall fluted ceramic vase with a narrow neck"
            rows={4}
            className="w-full resize-none rounded-xl border border-white/15 bg-zinc-900 px-4 py-3 text-zinc-50 placeholder:text-zinc-500 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          />
        ) : (
          <div className="flex flex-col gap-3">
            <label
              htmlFor="image-upload"
              className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-white/15 bg-zinc-900 p-8 transition-colors hover:border-violet-400/50"
            >
              {imagePreview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-48 rounded-lg object-contain"
                  />
                  <span className="text-sm text-zinc-400">
                    {imageFile?.name} ({(imageFile ? imageFile.size / 1024 : 0).toFixed(0)} KB)
                  </span>
                  <span className="text-xs text-zinc-500">Click to change</span>
                </>
              ) : (
                <>
                  <span className="text-2xl">📁</span>
                  <span className="text-sm text-zinc-400">
                    Drop an image or click to browse
                  </span>
                  <span className="text-xs text-zinc-500">JPEG or PNG, max 16MB</span>
                </>
              )}
              <input
                id="image-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageDrop}
                className="hidden"
              />
            </label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Optional: additional text prompt to guide generation"
              className="w-full rounded-xl border border-white/15 bg-zinc-900 px-4 py-3 text-sm text-zinc-50 placeholder:text-zinc-500 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
        )}

        {/* Parameter panel */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="self-start text-sm text-zinc-500 hover:text-zinc-300"
        >
          {showAdvanced ? "▾ Hide" : "▸ Advanced"} parameters
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-white/10 bg-zinc-900/50 p-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-400">
                Face count: {params.face_count.toLocaleString()}
              </span>
              <input
                type="range"
                min={3000}
                max={1500000}
                step={10000}
                value={params.face_count}
                onChange={(e) =>
                  setParams({ ...params, face_count: Number(e.target.value) })
                }
                className="accent-violet-500"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-400">Generate type</span>
              <select
                value={params.generate_type}
                onChange={(e) =>
                  setParams({
                    ...params,
                    generate_type: e.target.value as Params["generate_type"],
                  })
                }
                className="rounded-lg border border-white/15 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                {["Normal", "LowPoly", "Geometry", "Sketch"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                checked={params.enable_pbr}
                onChange={(e) =>
                  setParams({ ...params, enable_pbr: e.target.checked })
                }
                className="accent-violet-500"
              />
              <span className="text-xs text-zinc-400">Enable PBR materials</span>
            </label>

            {params.generate_type === "LowPoly" && (
              <label className="flex flex-col gap-1">
                <span className="text-xs text-zinc-400">Polygon type</span>
                <select
                  value={params.polygon_type}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      polygon_type: e.target.value as "triangle" | "quadrilateral",
                    })
                  }
                  className="rounded-lg border border-white/15 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                >
                  <option value="triangle">Triangle</option>
                  <option value="quadrilateral">Quadrilateral</option>
                </select>
              </label>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={
            isLoading ||
            (activeTab === "text" && !prompt.trim()) ||
            (activeTab === "image" && !imageFile)
          }
          className="self-center rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-8 py-3 font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {isLoading ? "Submitting…" : "Generate"}
        </button>
      </form>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-center text-sm text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}
