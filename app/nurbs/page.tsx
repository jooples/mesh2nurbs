"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import NurbsViewer, { type NurbsData, type NurbsPatch } from "@/components/NurbsViewer";

const SAMPLE_URL = "/sample-nurbs.json";

function validateNurbsData(json: unknown): NurbsData {
  if (typeof json !== "object" || json === null || !("patches" in json)) {
    throw new Error("Expected an object with a \"patches\" array.");
  }
  const patches = (json as { patches: unknown }).patches;
  if (!Array.isArray(patches) || patches.length === 0) {
    throw new Error("\"patches\" must be a non-empty array.");
  }

  const numberArrayFields: (keyof NurbsPatch)[] = [
    "vertices",
    "normals",
    "indices",
    "edgeIndices",
    "controlPoints",
  ];

  patches.forEach((patch, i) => {
    if (typeof patch !== "object" || patch === null) {
      throw new Error(`Patch ${i} is not an object.`);
    }
    const p = patch as Record<string, unknown>;
    for (const field of ["cpU", "cpV", "cpDim"]) {
      if (typeof p[field] !== "number") {
        throw new Error(`Patch ${i} is missing numeric field "${field}".`);
      }
    }
    for (const field of numberArrayFields) {
      if (!Array.isArray(p[field]) || !p[field].every((v) => typeof v === "number")) {
        throw new Error(`Patch ${i} is missing a numeric array field "${field}".`);
      }
    }
  });

  return json as NurbsData;
}

export default function NurbsPage() {
  const [data, setData] = useState<NurbsData | null>(null);
  const [source, setSource] = useState<string>("Sample surface");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSample = useCallback(() => {
    fetch(SAMPLE_URL)
      .then((res) => res.json())
      .then((json) => {
        setData(validateNurbsData(json));
        setSource("Sample surface");
      })
      .catch(() => setError("Failed to load the sample NURBS surface."))
      .finally(() => setIsLoading(false));
  }, []);

  const loadSample = useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetchSample();
  }, [fetchSample]);

  useEffect(() => {
    fetchSample();
  }, [fetchSample]);

  const processFile = useCallback((file: File) => {
    setIsLoading(true);
    setError(null);
    file
      .text()
      .then((text) => {
        const json = JSON.parse(text);
        setData(validateNurbsData(json));
        setSource(file.name);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to parse the uploaded file.");
      })
      .finally(() => {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) {
      dragCounter.current += 1;
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-zinc-50 sm:text-4xl">
          NURBS patch viewer
        </h1>
        <p className="mt-3 text-zinc-400">
          Renders a NURBS surface with its control points and control net.
          Upload your own JSON file matching the sample schema, or view the
          built-in example.
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <label className="cursor-pointer rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-200">
            Upload NURBS JSON
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {source !== "Sample surface" && (
            <button
              type="button"
              onClick={loadSample}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition-colors hover:text-white"
            >
              Reset to sample
            </button>
          )}
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-center text-sm text-red-400">
            {error}
          </p>
        )}

        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`relative rounded-2xl transition-colors ${
            isDragging ? "ring-2 ring-violet-400" : ""
          }`}
        >
          {isLoading ? (
            <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-white/10 bg-zinc-900">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            </div>
          ) : (
            data && <NurbsViewer data={data} label={source} />
          )}

          {isDragging && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl border-2 border-dashed border-violet-400 bg-black/70">
              <p className="text-sm font-medium text-violet-200">
                Drop NURBS JSON to load
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-zinc-500">
          or drag and drop a .json file onto the viewer above
        </p>
      </div>
    </section>
  );
}
