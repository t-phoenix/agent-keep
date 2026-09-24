"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, Mesh, Points } from "three";
import * as THREE from "three";

type Props = {
  progress: number;
  reduced: boolean;
};

function Dust({ count = 180, reduced }: { count?: number; reduced: boolean }) {
  const points = useRef<Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 8;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
    }
    return arr;
  }, [count]);

  useFrame((_, dt) => {
    if (!points.current || reduced) return;
    points.current.rotation.y += dt * 0.02;
    points.current.rotation.x += dt * 0.008;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.018}
        color="#c4a574"
        transparent
        opacity={0.35}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function KeepScene({ progress, reduced }: Props) {
  const group = useRef<Group>(null);
  const outer = useRef<Mesh>(null);
  const inner = useRef<Mesh>(null);
  const filament = useRef<Mesh>(null);
  const core = useRef<Mesh>(null);

  const open = 0.35 + progress * 1.15;

  const outerGeo = useMemo(() => new THREE.TorusGeometry(1.35, 0.085, 48, 128), []);
  const innerGeo = useMemo(() => new THREE.TorusGeometry(0.92, 0.038, 32, 96), []);
  const filamentGeo = useMemo(() => new THREE.TorusGeometry(1.14, 0.028, 16, 128), []);

  useFrame((state, dt) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;

    group.current.rotation.x = 0.55 + progress * 0.42 + Math.sin(t * 0.2) * 0.04;
    group.current.rotation.y = (reduced ? 0 : t * 0.12) + progress * 0.55;
    group.current.position.z = -0.2 - progress * 0.9;
    group.current.scale.setScalar(0.95 + progress * 0.28);

    if (outer.current) {
      const mat = outer.current.material as THREE.MeshStandardMaterial;
      mat.metalness = 0.72 + progress * 0.18;
      mat.roughness = 0.28 - progress * 0.08;
    }
    if (filament.current) {
      // Reveal more of the amber continuity ring as the user scrolls
      const reveal = 0.25 + progress * 0.75;
      filament.current.scale.set(1, 1, reveal);
      filament.current.rotation.z = -0.4 - progress * 0.5;
      if (!reduced) filament.current.rotation.z -= dt * 0.08;
      const mat = filament.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.35 + progress * 0.85 + Math.sin(t * 1.4) * 0.08;
      mat.opacity = 0.55 + progress * 0.45;
    }
    if (core.current) {
      const s = 0.12 + open * 0.22;
      core.current.scale.setScalar(s);
      const mat = core.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.15 + progress * 0.45;
    }
    if (inner.current && !reduced) {
      inner.current.rotation.z += dt * 0.15;
    }
  });

  return (
    <group ref={group}>
      <mesh ref={outer} geometry={outerGeo}>
        <meshStandardMaterial color="#2a2a28" metalness={0.8} roughness={0.28} envMapIntensity={0.6} />
      </mesh>
      <mesh ref={inner} geometry={innerGeo} rotation={[Math.PI / 2.4, 0.2, 0]}>
        <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh ref={filament} geometry={filamentGeo} rotation={[0.15, 0.1, -0.4]}>
        <meshStandardMaterial
          color="#c4a574"
          emissive="#c4a574"
          emissiveIntensity={0.5}
          metalness={0.9}
          roughness={0.18}
          transparent
          opacity={0.7}
        />
      </mesh>
      <mesh ref={core}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color="#c4a574"
          emissive="#c4a574"
          emissiveIntensity={0.4}
          transparent
          opacity={0.2}
          roughness={0.5}
        />
      </mesh>
      {/* Soft rim disc */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.02]}>
        <ringGeometry args={[0.55, 1.55, 64]} />
        <meshBasicMaterial color="#c4a574" transparent opacity={0.04 + progress * 0.06} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function HeroCanvas({ progress = 0 }: { progress?: number }) {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const p = Math.min(1, Math.max(0, progress));

  return (
    <Canvas
      className="ak-motion"
      dpr={typeof window !== "undefined" && window.innerWidth < 768 ? [1, 1.25] : [1, 1.75]}
      camera={{ position: [0, 0.15, 4.4], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
    >
      <fog attach="fog" args={["#0e0e0e", 4.5, 11]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 7, 3]} intensity={1.15} color="#f4f4f0" />
      <directionalLight position={[-5, -2, -4]} intensity={0.55} color="#c4a574" />
      <pointLight position={[0, 0, 2]} intensity={0.35 + p * 0.5} color="#c4a574" distance={6} />
      <Dust count={reduced ? 60 : 200} reduced={reduced} />
      <KeepScene progress={p} reduced={reduced} />
    </Canvas>
  );
}
