"use client";

import { Suspense, useRef, useMemo, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import type { Mesh } from "three";

type MeshViewerProps = {
  modelUrl?: string;
  previewUrl?: string;
  label?: string;
  className?: string;
};

/* ------------------------------------------------------------------ */
/*  Placeholder – rotating icosahedron                                 */
/* ------------------------------------------------------------------ */
function PlaceholderMesh() {
  const meshRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x += delta * 0.25;
    meshRef.current.rotation.y += delta * 0.35;
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#7c6ef2" roughness={0.3} metalness={0.2} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/*  OBJ loader                                                         */
/* ------------------------------------------------------------------ */
function ObjModel({ url }: { url: string }) {
  const obj = useLoader(OBJLoader, url);

  const prepared = useMemo(() => {
    const clone = obj.clone();
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? 2 / maxDim : 1;
    clone.position.sub(center.multiplyScalar(1));
    clone.scale.setScalar(scale);
    clone.position.multiplyScalar(scale);

    clone.traverse((child: THREE.Object3D) => {
      if ((child as Mesh).isMesh) {
        const m = child as Mesh;
        const defaultMat = new THREE.MeshStandardMaterial({
          color: "#b8b3e6",
          roughness: 0.5,
          metalness: 0.1,
        });
        if (Array.isArray(m.material)) {
          m.material = m.material.map(() => defaultMat);
        } else {
          m.material = defaultMat;
        }
      }
    });
    return clone;
  }, [obj]);

  return <primitive object={prepared} />;
}

/* ------------------------------------------------------------------ */
/*  GLB / GLTF loader – preserves PBR textures                        */
/* ------------------------------------------------------------------ */
function GlbModel({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url);

  const prepared = useMemo(() => {
    const scene = gltf.scene.clone();
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? 2 / maxDim : 1;
    scene.position.sub(center.multiplyScalar(1));
    scene.scale.setScalar(scale);
    scene.position.multiplyScalar(scale);
    return scene;
  }, [gltf]);

  return <primitive object={prepared} />;
}

/* ------------------------------------------------------------------ */
/*  Auto-detect format from URL                                        */
/* ------------------------------------------------------------------ */
function ModelFromUrl({ url }: { url: string }) {
  const lower = url.split("?")[0].toLowerCase();
  if (lower.endsWith(".glb") || lower.endsWith(".gltf")) {
    return <GlbModel url={url} />;
  }
  return <ObjModel url={url} />;
}

/* ------------------------------------------------------------------ */
/*  MeshViewer                                                         */
/* ------------------------------------------------------------------ */
export default function MeshViewer({
  modelUrl,
  previewUrl,
  label,
  className,
}: MeshViewerProps) {
  const lower = (modelUrl || "").split("?")[0].toLowerCase();
  const isObj = lower.endsWith(".obj");
  const isGlb = lower.endsWith(".glb") || lower.endsWith(".gltf");
  const [brightLighting, setBrightLighting] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className={`group relative aspect-square w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 ${modelUrl ? "hover:cursor-grab active:cursor-grabbing" : ""} ${className ?? ""}`}
    >
      <Canvas camera={{ position: [2.5, 2, 2.5], fov: 45 }}>
        <ambientLight intensity={brightLighting ? 3.5 : 0.6} />
        <directionalLight position={[3, 3, 3]} intensity={brightLighting ? 4 : 1.2} />
        <directionalLight position={[-2, 1, -1]} intensity={brightLighting ? 2.5 : 0.3} />
        {brightLighting && (
          <>
            <directionalLight position={[0, -3, 2]} intensity={2} />
            <directionalLight position={[-3, 2, -3]} intensity={2} />
            <hemisphereLight args={["#ffffff", "#404040", 1.5]} />
          </>
        )}
        <Suspense fallback={null}>
          {modelUrl ? <ModelFromUrl url={modelUrl} /> : <PlaceholderMesh />}
        </Suspense>
        {/* Static by default; only responds to drag/zoom while hovered. */}
        <OrbitControls
          enablePan={true}
          enabled={hovered}
          autoRotate={false}
        />
      </Canvas>

      {/* Label overlay when no model */}
      {!modelUrl && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-center text-xs text-zinc-300">
          {label ?? "Viewer placeholder — model will render here"}
        </div>
      )}

      {/* Static preview cover: shown by default so the card sits still, then
          fades out on hover to reveal the interactive (draggable) 3D model. */}
      {previewUrl && modelUrl && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl bg-zinc-900 opacity-100 transition-opacity duration-500 group-hover:opacity-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Model preview"
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Format badge */}
      {modelUrl && (
        <div className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/70 backdrop-blur">
          {(isObj && "OBJ") || (isGlb && "GLB") || "3D"}
        </div>
      )}

      {/* Lighting toggle */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setBrightLighting((v) => !v);
        }}
        className={`pointer-events-auto absolute left-2 top-2 z-10 rounded-full border px-3 py-1 text-[10px] font-medium backdrop-blur ${
          brightLighting
            ? "border-amber-400/60 bg-amber-400/20 text-amber-200"
            : "border-white/10 bg-black/60 text-white/70"
        }`}
      >
        {brightLighting ? "☀️ Bright" : "💡 Lighting"}
      </button>
    </div>
  );
}
