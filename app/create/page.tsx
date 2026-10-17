"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useCredits } from "@/lib/credits";
import { jobsApi, ApiError } from "@/lib/api";
import TimeEstimate from "@/components/TimeEstimate";
import { validateImageUpload } from "@/lib/image-upload";
import { RetryableRequest } from "@/lib/retryable-request";

type TabType = "text" | "image";

type Params = {
  face_count: number;
  generate_type: "Normal" | "LowPoly" | "Geometry" | "Sketch";
  enable_pbr: boolean;
  polygon_type: "triangle" | "quadrilateral";
  alpha: number;
  offset: number;
  auto_post_process: boolean;
};

const DEFAULT_PARAMS: Params = {
  face_count: 5000,
  generate_type: "Normal",
  enable_pbr: false,
  polygon_type: "triangle",
  alpha: 0.05,
  offset: 0.005,
  auto_post_process: true,
};

export default function CreatePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { refreshCredits } = useCredits();

  const [activeTab, setActiveTab] = useState<TabType>("text");
  const [prompt, setPrompt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isValidatingImage, setIsValidatingImage] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const selectionVersion = useRef(0);
  const imageIdentity = useRef<string | null>(null);
  const submitLock = useRef(false);
  const requestAttempt = useRef(new RetryableRequest());

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);
  useEffect(() => () => { selectionVersion.current += 1; }, []);

  const selectImage = async (files: FileList | null) => {
    if (!files?.length) return;
    const version = ++selectionVersion.current;
    if (files.length !== 1) {
      setIsValidatingImage(false);
      setError("Choose one image at a time.");
      return;
    }
    setIsValidatingImage(true);
    setError(null);
    let preview: string | null = null;
    try {
      const file = files[0];
      await validateImageUpload(file);
      preview = URL.createObjectURL(file);
      const image = new Image();
      image.src = preview;
      await image.decode();
      if (version !== selectionVersion.current) return;
      setImageFile(file);
      setImagePreview(preview);
      imageIdentity.current = crypto.randomUUID();
      preview = null; // The preview effect owns this URL until replacement/unmount.
    } catch (err) {
      if (version === selectionVersion.current) {
        setError(err instanceof Error && err.name !== "EncodingError" ? err.message : "This image could not be read. Choose another file.");
      }
    } finally {
      if (preview) URL.revokeObjectURL(preview);
      if (version === selectionVersion.current) setIsValidatingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLock.current || isValidatingImage) return;
    if (activeTab === "text" && !prompt.trim()) return;
    if (activeTab === "image" && !imageFile) return;
    if (!isAuthenticated) {
      router.push("/login?redirect=/create");
      return;
    }

    submitLock.current = true;
    setIsLoading(true);
    setError(null);
    let accepted = false;

    try {
      let job;
      const requestKey = requestAttempt.current.keyFor({ tab: activeTab, prompt: prompt.trim(), params, image: activeTab === "image" ? imageIdentity.current : null });

      if (activeTab === "text") {
        job = await jobsApi.createTextTo3D({
          prompt: prompt.trim(),
          ...(params.enable_pbr !== undefined && { enable_pbr: params.enable_pbr }),
          ...(params.face_count && { face_count: params.face_count }),
          ...(params.generate_type && { generate_type: params.generate_type }),
          ...(params.polygon_type && { polygon_type: params.polygon_type }),
          alpha: params.alpha,
          offset: params.offset,
          auto_post_process: params.auto_post_process,
        }, requestKey);
      } else {
        job = await jobsApi.createImageTo3D(imageFile!, {
          prompt: prompt.trim() || undefined,
          enable_pbr: params.enable_pbr,
          face_count: params.face_count,
          generate_type: params.generate_type,
          polygon_type: params.polygon_type,
          alpha: params.alpha,
          offset: params.offset,
          auto_post_process: params.auto_post_process,
        }, requestKey);
      }

      // Redirect to job detail page — status is polled there in real time
      requestAttempt.current.complete();
      accepted = true;
      void refreshCredits();
      router.push(`/jobs/${job.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = err.detail;
        setError(
          typeof detail === "string"
            ? detail
            : (detail as { detail?: string })?.detail || "Submit failed"
        );
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      if (!accepted) {
        submitLock.current = false;
        setIsLoading(false);
      }
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-stone-900 sm:text-4xl dark:bg-gradient-to-br dark:from-white dark:to-violet-200 dark:bg-clip-text dark:text-transparent">
          Generate a 3D model
        </h1>
        <p className="mt-3 text-stone-600 dark:text-zinc-400">
          Describe what you want to create and we&apos;ll turn it into a 3D model.
        </p>
        {!isAuthenticated && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
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
                ? "bg-gradient-to-r from-violet-600 to-rose-400 text-white shadow-md shadow-violet-500/20"
                : "bg-stone-200 text-stone-600 hover:text-stone-900 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
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
            className="w-full resize-none rounded-xl border border-stone-300 bg-white dark:border-white/15 dark:bg-zinc-900 px-4 py-3 text-stone-900 dark:text-zinc-50 placeholder:text-stone-500 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          />
        ) : (
          <div className="flex flex-col gap-3">
            <label
              htmlFor="image-upload"
              tabIndex={0}
              role="button"
              aria-label="Choose or replace an image"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); imageInput.current?.click(); }
              }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setIsDragging(true); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDragging(false); }}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); void selectImage(e.dataTransfer.files); }}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-white dark:bg-zinc-900 p-8 transition-colors hover:border-violet-400/50 focus-visible:outline-2 focus-visible:outline-violet-500 ${isDragging ? "border-violet-500 bg-violet-50" : "border-stone-300 dark:border-white/15"}`}
            >
              {imagePreview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-48 rounded-lg object-contain"
                  />
                  <span className="text-sm text-stone-600 dark:text-zinc-400">
                    {imageFile?.name} ({(imageFile ? imageFile.size / 1024 : 0).toFixed(0)} KB)
                  </span>
                  <span className="text-xs text-stone-500">Drop another image or click to replace</span>
                </>
              ) : (
                <>
                  <span className="text-2xl">📁</span>
                  <span className="text-sm text-stone-600 dark:text-zinc-400">
                    Drop an image or click to browse
                  </span>
                  <span className="text-xs text-stone-500">JPEG, PNG, or WebP, max 16 MB</span>
                </>
              )}
              <input
                id="image-upload"
                ref={imageInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => { void selectImage(e.target.files); e.target.value = ""; }}
                className="hidden"
              />
            </label>
            {isValidatingImage && <p role="status" className="text-sm text-stone-500">Checking image…</p>}
            {imageFile && <button type="button" className="self-start text-sm text-stone-500 underline" onClick={() => {
              selectionVersion.current += 1; imageIdentity.current = null;
              setImageFile(null); setImagePreview(null); setIsValidatingImage(false); setError(null);
            }}>Remove image</button>}
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Optional: additional text prompt to guide generation"
              className="w-full rounded-xl border border-stone-300 bg-white dark:border-white/15 dark:bg-zinc-900 px-4 py-3 text-sm text-stone-900 dark:text-zinc-50 placeholder:text-stone-500 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
        )}

        {/* Face count — visible to everyone, not tucked behind Advanced */}
        <label className="flex flex-col gap-1 rounded-xl border border-stone-200 bg-stone-50 dark:border-white/10 dark:bg-zinc-900/50 p-4">
          <span className="flex items-center justify-between gap-2 text-xs text-stone-600 dark:text-zinc-400">
            <span>Face count</span>
            <input
              type="text"
              inputMode="numeric"
              value={params.face_count || ""}
              onChange={(e) => {
                const digits = e.target.value.replace(/[^0-9]/g, "");
                setParams({ ...params, face_count: digits === "" ? 0 : Number(digits) });
              }}
              onBlur={(e) => {
                const v = Number(e.target.value.replace(/[^0-9]/g, "")) || 3000;
                setParams({ ...params, face_count: Math.min(30000, Math.max(3000, v)) });
              }}
              className="w-24 rounded-md border border-stone-300 bg-white dark:border-white/15 dark:bg-zinc-900 px-2 py-1 text-right text-stone-900 dark:text-zinc-50 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </span>
          <input
            type="range"
            min={3000}
            max={30000}
            step={1000}
            value={params.face_count}
            onChange={(e) =>
              setParams({ ...params, face_count: Number(e.target.value) })
            }
            className="accent-violet-500"
          />
          <span className="text-[11px] text-stone-500">
            Roughly how many triangles the final mesh has — more faces add
            detail but increase file size and load time. Type a value or
            drag the slider (3,000–30,000).
          </span>
        </label>

        {/* Parameter panel — always visible, no toggle */}
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-stone-200 bg-stone-50 dark:border-white/10 dark:bg-zinc-900/50 p-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-stone-600 dark:text-zinc-400">Generate type</span>
              <select
                value={params.generate_type}
                onChange={(e) =>
                  setParams({
                    ...params,
                    generate_type: e.target.value as Params["generate_type"],
                  })
                }
                className="rounded-lg border border-stone-300 bg-white dark:border-white/15 dark:bg-zinc-900 px-3 py-2 text-sm text-stone-900 dark:text-zinc-50 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                {["Normal", "LowPoly", "Geometry", "Sketch"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-stone-500">
                Overall generation mode — changes mesh style and which
                other options below apply (e.g. Polygon type only applies
                to LowPoly).
              </span>
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
              <span className="text-xs text-stone-600 dark:text-zinc-400">
                Enable PBR materials
                <span className="ml-1 text-stone-500">
                  — generates physically-based texture maps (color,
                  roughness, metallic) for more realistic shading.
                </span>
              </span>
            </label>

            {params.generate_type === "LowPoly" && (
              <label className="flex flex-col gap-1">
                <span className="text-xs text-stone-600 dark:text-zinc-400">Polygon type</span>
                <select
                  value={params.polygon_type}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      polygon_type: e.target.value as "triangle" | "quadrilateral",
                    })
                  }
                  className="rounded-lg border border-stone-300 bg-white dark:border-white/15 dark:bg-zinc-900 px-3 py-2 text-sm text-stone-900 dark:text-zinc-50 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                >
                  <option value="triangle">Triangle</option>
                  <option value="quadrilateral">Quadrilateral</option>
                </select>
                <span className="text-[11px] text-stone-500">
                  Face shape used for the low-poly mesh — triangles suit
                  most viewers and engines, quads suit box-modeling and
                  subdivision workflows.
                </span>
              </label>
            )}

            <div className="flex flex-col gap-4 sm:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={params.auto_post_process}
                  onChange={(e) =>
                    setParams({ ...params, auto_post_process: e.target.checked })
                  }
                  className="accent-violet-500"
                />
                <span className="text-xs text-stone-600 dark:text-zinc-400">
                  Automatically run post-processing (NURBS conversion) when generation finishes
                </span>
              </label>

              <p className="text-xs text-stone-500">
                The two sliders below control that post-processing step (alpha
                wrap), which converts the mesh into NURBS surfaces. If
                auto-run is off, you can still trigger it manually later from
                the model page.
              </p>

              <label className="flex flex-col gap-1">
                <span className="flex items-center justify-between gap-2 text-xs text-stone-600 dark:text-zinc-400">
                  <span>Alpha wrap coarseness</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={params.alpha}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9.]/g, "");
                      setParams({ ...params, alpha: v === "" ? 0 : Number(v) });
                    }}
                    onBlur={(e) => {
                      const v = Number(e.target.value) || 0.05;
                      setParams({ ...params, alpha: Math.min(0.2, Math.max(0.01, v)) });
                    }}
                    className="w-20 rounded-md border border-stone-300 bg-white dark:border-white/15 dark:bg-zinc-900 px-2 py-1 text-right text-stone-900 dark:text-zinc-50 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  />
                </span>
                <input
                  type="range"
                  min={0.01}
                  max={0.2}
                  step={0.01}
                  value={params.alpha}
                  onChange={(e) => setParams({ ...params, alpha: Number(e.target.value) })}
                  className="accent-violet-500"
                />
                <span className="text-[11px] text-stone-500">
                  How tightly the wrap hugs the mesh — lower preserves more
                  detail but is more likely to fail on complex meshes; higher
                  is coarser but more robust. 0.01–0.2 (default 0.05).
                </span>
              </label>

              <label className="flex flex-col gap-1">
                <span className="flex items-center justify-between gap-2 text-xs text-stone-600 dark:text-zinc-400">
                  <span>Offset</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={params.offset}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9.]/g, "");
                      setParams({ ...params, offset: v === "" ? 0 : Number(v) });
                    }}
                    onBlur={(e) => {
                      const v = Number(e.target.value) || 0.005;
                      setParams({ ...params, offset: Math.min(0.02, Math.max(0.001, v)) });
                    }}
                    className="w-20 rounded-md border border-stone-300 bg-white dark:border-white/15 dark:bg-zinc-900 px-2 py-1 text-right text-stone-900 dark:text-zinc-50 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  />
                </span>
                <input
                  type="range"
                  min={0.001}
                  max={0.02}
                  step={0.001}
                  value={params.offset}
                  onChange={(e) => setParams({ ...params, offset: Number(e.target.value) })}
                  className="accent-violet-500"
                />
                <span className="text-[11px] text-stone-500">
                  Buffer distance added around the mesh during wrapping —
                  helps bridge small holes/gaps; larger values thicken thin
                  features. 0.001–0.02 (default 0.005).
                </span>
              </label>
            </div>
          </div>

        <TimeEstimate
          jobType={activeTab === "text" ? "text-to-3d" : "image-to-3d"}
          faceCount={params.face_count}
          alpha={params.alpha}
          offset={params.offset}
          className="self-center"
        />

        <button
          type="submit"
          disabled={
            isLoading || isValidatingImage ||
            (activeTab === "text" && !prompt.trim()) ||
            (activeTab === "image" && !imageFile)
          }
          className="self-center rounded-full bg-gradient-to-r from-violet-600 to-rose-400 px-8 py-3 font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {isLoading ? "Submitting…" : "Generate"}
        </button>
      </form>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-50 p-3 text-center text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}
