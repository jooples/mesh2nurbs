"use client";

import { Suspense, useRef, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import * as THREE from "three";
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

function ObjModel({ url }: { url: string }) {
  const obj = useLoader(OBJLoader, url);

  // Center the model and scale it to fit the view
  const prepared = useMemo(() => {
    const clone = obj.clone();
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim; // fit within ~2 units
    clone.position.sub(center.multiplyScalar(1));
    clone.scale.setScalar(scale);
    clone.position.multiplyScalar(scale);

    // Give untextured OBJs a visible material
    clone.traverse((child) => {
      if ((child as Mesh).isMesh) {
        (child as Mesh).material = new THREE.MeshStandardMaterial({
          color: "#b8b3e6",
          roughness: 0.5,
          metalness: 0.1,
        });
      }
    });
    return clone;
  }, [obj]);

  return <primitive object={prepared} />;
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
          {modelUrl ? <ObjModel url={modelUrl} /> : <PlaceholderMesh />}
        </Suspense>
        <OrbitControls enablePan={false} autoRotate={!!modelUrl} />
      </Canvas>
      {!modelUrl && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-center text-xs text-zinc-300">
          {label ?? "Viewer placeholder — model will render here"}
        </div>
      )}
    </div>
  );
}