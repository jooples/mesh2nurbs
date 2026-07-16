"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { Mesh } from "three";

type MeshViewerProps = {
  /** URL of the real mesh/NURBS asset to render. Left undefined until the
   * Hunyuan3D + mesh-to-NURBS pipeline is wired up (see lib/tencentHunyuan.ts
   * and lib/meshToNurbs.ts) — the placeholder below renders until then. */
  modelUrl?: string;
  label?: string;
  className?: string;
};

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
      <meshStandardMaterial
        color="#7c6ef2"
        wireframe={false}
        roughness={0.3}
        metalness={0.2}
      />
    </mesh>
  );
}

export default function MeshViewer({ modelUrl, label, className }: MeshViewerProps) {
  return (
    <div
      className={`relative aspect-square w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 ${className ?? ""}`}
    >
      <Canvas camera={{ position: [2.5, 2, 2.5], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 3, 3]} intensity={1} />
        <Suspense fallback={null}>
          {/* TODO: once modelUrl is populated by the real pipeline, load and
              render the actual mesh/NURBS asset here instead of the placeholder. */}
          <PlaceholderMesh />
        </Suspense>
        <OrbitControls enablePan={false} autoRotate={false} />
      </Canvas>
      {!modelUrl && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-center text-xs text-zinc-300">
          {label ?? "Viewer placeholder — model will render here"}
        </div>
      )}
    </div>
  );
}
