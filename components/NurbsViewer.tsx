"use client";

import { Suspense, useMemo, useState } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

type NurbsPatch = {
  patchId: number;
  cpU: number;
  cpV: number;
  cpDim: number;
  vertices: number[];
  normals: number[];
  indices: number[];
  edgeIndices: number[];
  controlPoints: number[];
};

type NurbsData = {
  patches: NurbsPatch[];
};

type NurbsViewerProps = {
  url: string;
  label?: string;
  className?: string;
};

function PatchSurface({ patch }: { patch: NurbsPatch }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(patch.vertices, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(patch.normals, 3));
    geo.setIndex(patch.indices);
    return geo;
  }, [patch]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#b8b3e6" roughness={0.5} metalness={0.1} side={THREE.DoubleSide} />
    </mesh>
  );
}

function PatchEdges({ patch }: { patch: NurbsPatch }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(patch.vertices, 3));
    geo.setIndex(patch.edgeIndices);
    return geo;
  }, [patch]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#1a1625" />
    </lineSegments>
  );
}

function ControlPoints({ patch }: { patch: NurbsPatch }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(patch.controlPoints, patch.cpDim));
    return geo;
  }, [patch]);

  return (
    <points geometry={geometry}>
      <pointsMaterial color="#f2a93b" size={0.06} sizeAttenuation />
    </points>
  );
}

// cpU x cpV grid of control points, row-major (index = v * cpU + u).
// Connects each point to its neighbor along u and along v to form the net.
function ControlNet({ patch }: { patch: NurbsPatch }) {
  const geometry = useMemo(() => {
    const { cpU, cpV, cpDim, controlPoints } = patch;
    const pointIndex = (u: number, v: number) => v * cpU + u;
    const netIndices: number[] = [];
    for (let v = 0; v < cpV; v++) {
      for (let u = 0; u < cpU - 1; u++) {
        netIndices.push(pointIndex(u, v), pointIndex(u + 1, v));
      }
    }
    for (let u = 0; u < cpU; u++) {
      for (let v = 0; v < cpV - 1; v++) {
        netIndices.push(pointIndex(u, v), pointIndex(u, v + 1));
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(controlPoints, cpDim));
    geo.setIndex(netIndices);
    return geo;
  }, [patch]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#f2a93b" transparent opacity={0.6} />
    </lineSegments>
  );
}

function NurbsPatches({
  data,
  showControlPoints,
  showControlNet,
}: {
  data: NurbsData;
  showControlPoints: boolean;
  showControlNet: boolean;
}) {
  // Center and scale the whole patch set to fit the view, same approach as ObjModel.
  // Control points can extend past the surface itself, so include them in the
  // fit even when hidden — otherwise toggling them on clips outside the frustum.
  const { center, scale } = useMemo(() => {
    const box = new THREE.Box3();
    for (const patch of data.patches) {
      for (let i = 0; i < patch.vertices.length; i += 3) {
        box.expandByPoint(
          new THREE.Vector3(patch.vertices[i], patch.vertices[i + 1], patch.vertices[i + 2])
        );
      }
      for (let i = 0; i < patch.controlPoints.length; i += patch.cpDim) {
        box.expandByPoint(
          new THREE.Vector3(
            patch.controlPoints[i],
            patch.controlPoints[i + 1],
            patch.controlPoints[i + 2]
          )
        );
      }
    }
    const boxCenter = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    return { center: boxCenter, scale: 2 / maxDim };
  }, [data]);

  return (
    <group position={center.clone().multiplyScalar(-scale)} scale={scale}>
      {data.patches.map((patch) => (
        <group key={patch.patchId}>
          <PatchSurface patch={patch} />
          <PatchEdges patch={patch} />
          {showControlPoints && <ControlPoints patch={patch} />}
          {showControlNet && <ControlNet patch={patch} />}
        </group>
      ))}
    </group>
  );
}

function NurbsModel({
  url,
  showControlPoints,
  showControlNet,
}: {
  url: string;
  showControlPoints: boolean;
  showControlNet: boolean;
}) {
  const data = useLoader(THREE.FileLoader, url, (loader) => {
    loader.setResponseType("json");
  }) as unknown as NurbsData;

  return (
    <NurbsPatches data={data} showControlPoints={showControlPoints} showControlNet={showControlNet} />
  );
}

export default function NurbsViewer({ url, label, className }: NurbsViewerProps) {
  const [showControlPoints, setShowControlPoints] = useState(true);
  const [showControlNet, setShowControlNet] = useState(true);

  return (
    <div
      className={`relative aspect-square w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 ${className ?? ""}`}
    >
      <Canvas camera={{ position: [2.5, 2, 2.5], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 3, 3]} intensity={1} />
        <Suspense fallback={null}>
          <NurbsModel url={url} showControlPoints={showControlPoints} showControlNet={showControlNet} />
        </Suspense>
        <OrbitControls enablePan={false} />
      </Canvas>
      <div className="pointer-events-auto absolute right-3 top-3 flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setShowControlPoints((v) => !v)}
          className={`rounded-full border px-3 py-1 backdrop-blur ${
            showControlPoints
              ? "border-amber-400/60 bg-amber-400/20 text-amber-200"
              : "border-white/10 bg-black/40 text-zinc-300"
          }`}
        >
          Control points
        </button>
        <button
          type="button"
          onClick={() => setShowControlNet((v) => !v)}
          className={`rounded-full border px-3 py-1 backdrop-blur ${
            showControlNet
              ? "border-amber-400/60 bg-amber-400/20 text-amber-200"
              : "border-white/10 bg-black/40 text-zinc-300"
          }`}
        >
          Control net
        </button>
      </div>
      {label && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-center text-xs text-zinc-300">
          {label}
        </div>
      )}
    </div>
  );
}
