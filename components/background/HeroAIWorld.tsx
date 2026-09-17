"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePrefersReducedMotion } from "@/lib/motion";

type EventKind = "ambient" | "tensor" | "attention" | "vector" | "vision" | "agent";

type FlowRoute = {
  curve: THREE.CatmullRomCurve3;
  event: EventKind;
  phase: number;
};

type ComputeData = {
  architectureGeometry: THREE.BufferGeometry;
  embeddingGeometry: THREE.BufferGeometry;
  activeEmbeddingPositions: THREE.Vector3[];
  tensorPositions: THREE.Vector3[];
  tensorSeeds: number[];
  flowRoutes: FlowRoute[];
  flowTubeGeometries: THREE.TubeGeometry[];
  visionGeometry: THREE.BufferGeometry;
  agentModulePositions: THREE.Vector3[];
};

type EventWeights = Record<Exclude<EventKind, "ambient">, number>;

const fieldVertexShader = `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uActivation;
  uniform float uVariant;

  void main() {
    vUv = uv;
    vec3 transformed = position;
    float wave = sin((position.x * 4.4) + (position.y * 2.2) + uTime * 0.55 + uVariant);
    transformed.z += wave * 0.026 * (0.25 + uActivation);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const fieldFragmentShader = `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uActivation;
  uniform float uOpacity;
  uniform float uDensity;
  uniform float uVariant;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float fieldBlob(vec2 uv, vec2 center, float radius) {
    vec2 diff = uv - center;
    return exp(-dot(diff, diff) / radius);
  }

  void main() {
    vec2 uv = vUv;
    vec2 cells = floor(uv * vec2(54.0 * uDensity, 28.0 * uDensity));
    vec2 localCell = fract(uv * vec2(54.0 * uDensity, 28.0 * uDensity));
    float nearestEdge = min(min(localCell.x, 1.0 - localCell.x), min(localCell.y, 1.0 - localCell.y));
    float cellLine = 1.0 - smoothstep(0.0, 0.04, nearestEdge);
    float seeded = hash(cells + uVariant);

    vec2 c1 = vec2(0.26 + sin(uTime * 0.10 + uVariant) * 0.12, 0.42 + cos(uTime * 0.08) * 0.12);
    vec2 c2 = vec2(0.68 + cos(uTime * 0.07 + uVariant) * 0.10, 0.58 + sin(uTime * 0.09) * 0.10);
    vec2 c3 = vec2(0.50 + sin(uTime * 0.05 + uVariant) * 0.16, 0.22 + cos(uTime * 0.11) * 0.08);

    float heat =
      fieldBlob(uv, c1, 0.018) * 0.72 +
      fieldBlob(uv, c2, 0.026) * 0.54 +
      fieldBlob(uv, c3, 0.012) * 0.42;
    float cellEnergy = smoothstep(0.68, 0.98, seeded + heat * (0.55 + uActivation));
    float scan = smoothstep(0.96, 1.0, 1.0 - abs(fract(uv.x * 2.0 - uTime * 0.075) - 0.5) * 2.0);
    float value = cellLine * 0.08 + cellEnergy * (0.16 + uActivation * 0.76) + scan * uActivation * 0.18;

    vec3 steel = vec3(0.06, 0.057, 0.048);
    vec3 brass = vec3(0.80, 0.62, 0.30);
    vec3 warm = vec3(1.0, 0.94, 0.78);
    vec3 color = mix(steel, brass, value);
    color = mix(color, warm, smoothstep(0.42, 0.92, value) * uActivation);
    float alpha = (0.035 + value * 0.62) * uOpacity;

    gl_FragColor = vec4(color, alpha);
  }
`;

const labelItems = [
  { className: "ai-label-kv", text: "KV_CACHE 78%" },
  { className: "ai-label-attn", text: "ATTN [32,16,128,128]" },
  { className: "ai-label-embed", text: "EMBED 1024D -> 5 NN" },
  { className: "ai-label-infer", text: "INFERENCE 38.2MS" },
  { className: "ai-label-vision", text: "YOLO 4 DETECTIONS" },
  { className: "ai-label-agent", text: "AGENT_04 TOOL_CALL COMPLETE" },
];

function makeGeometry(values: number[]) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(values, 3));
  return geometry;
}

function pushLine(values: number[], a: THREE.Vector3, b: THREE.Vector3) {
  values.push(a.x, a.y, a.z, b.x, b.y, b.z);
}

function pushBoxFrame(values: number[], center: THREE.Vector3, size: THREE.Vector3) {
  const x = size.x / 2;
  const y = size.y / 2;
  const z = size.z / 2;
  const corners = [
    new THREE.Vector3(center.x - x, center.y - y, center.z - z),
    new THREE.Vector3(center.x + x, center.y - y, center.z - z),
    new THREE.Vector3(center.x + x, center.y + y, center.z - z),
    new THREE.Vector3(center.x - x, center.y + y, center.z - z),
    new THREE.Vector3(center.x - x, center.y - y, center.z + z),
    new THREE.Vector3(center.x + x, center.y - y, center.z + z),
    new THREE.Vector3(center.x + x, center.y + y, center.z + z),
    new THREE.Vector3(center.x - x, center.y + y, center.z + z),
  ];
  [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ].forEach(([from, to]) => pushLine(values, corners[from], corners[to]));
}

function windowPulse(phase: number, start: number, duration: number) {
  const local = (phase - start + 24) % 24;
  if (local > duration) return 0;
  return Math.sin((local / duration) * Math.PI);
}

function getEventWeights(time: number): EventWeights {
  const phase = time % 24;
  return {
    tensor: Math.max(windowPulse(phase, 3.0, 4.8), windowPulse(phase, 7.2, 2.6) * 0.42),
    attention: Math.max(windowPulse(phase, 5.2, 4.0), windowPulse(phase, 18.8, 2.8) * 0.36),
    vector: windowPulse(phase, 7.0, 3.6),
    vision: windowPulse(phase, 12.1, 3.2),
    agent: windowPulse(phase, 16.4, 4.4),
  };
}

function eventWeight(weights: EventWeights, event: EventKind) {
  if (event === "ambient") {
    return Math.max(weights.tensor, weights.attention, weights.vector, weights.vision, weights.agent) * 0.35;
  }
  return weights[event];
}

function createComputeData(): ComputeData {
  const architectureValues: number[] = [];
  const tensorPositions: THREE.Vector3[] = [];
  const tensorSeeds: number[] = [];
  const embeddingValues: number[] = [];
  const activeEmbeddingPositions: THREE.Vector3[] = [];
  const visionValues: number[] = [];

  [
    { center: new THREE.Vector3(-7.2, 2.3, -14.5), size: new THREE.Vector3(11.5, 2.9, 0.8) },
    { center: new THREE.Vector3(-4.0, 0.2, -11.6), size: new THREE.Vector3(9.6, 2.1, 0.65) },
    { center: new THREE.Vector3(5.8, 3.2, -16.0), size: new THREE.Vector3(13.6, 2.7, 0.7) },
    { center: new THREE.Vector3(8.1, -1.9, -13.4), size: new THREE.Vector3(8.4, 4.4, 0.7) },
    { center: new THREE.Vector3(0.0, -5.2, -18.0), size: new THREE.Vector3(23.0, 1.3, 0.7) },
  ].forEach(({ center, size }) => pushBoxFrame(architectureValues, center, size));

  for (let lane = -6; lane <= 6; lane += 1) {
    pushLine(
      architectureValues,
      new THREE.Vector3(lane * 1.8, -5.8, -6.0),
      new THREE.Vector3(lane * 2.9, -6.3, -22.0)
    );
  }

  for (let slice = 0; slice < 7; slice += 1) {
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 14; col += 1) {
        const x = -7.3 + col * 0.42 + Math.sin(row * 0.9 + slice) * 0.025;
        const y = 1.55 - row * 0.34 + Math.cos(col * 0.8 + slice) * 0.02;
        const z = -7.5 - slice * 0.6;
        tensorPositions.push(new THREE.Vector3(x, y, z));
        tensorSeeds.push((slice * 97 + row * 17 + col * 7) % 113);
      }
    }
  }

  const centers = [
    new THREE.Vector3(4.2, -2.1, -7.8),
    new THREE.Vector3(5.7, -1.1, -9.4),
    new THREE.Vector3(7.2, -2.7, -10.5),
    new THREE.Vector3(5.1, -3.35, -8.5),
  ];
  for (let index = 0; index < 1550; index += 1) {
    const center = centers[index % centers.length];
    const angle = index * 2.399963;
    const shell = 0.12 + ((index * 37) % 100) / 42;
    const point = new THREE.Vector3(
      center.x + Math.cos(angle) * shell * (0.92 + (index % 6) * 0.075),
      center.y + Math.sin(angle * 0.77) * shell * (0.58 + (index % 5) * 0.08),
      center.z + Math.sin(angle) * shell * 1.4
    );
    embeddingValues.push(point.x, point.y, point.z);
    if (index % 41 === 0 || index % 67 === 0) activeEmbeddingPositions.push(point);
  }

  pushBoxFrame(visionValues, new THREE.Vector3(8.4, 1.1, -7.8), new THREE.Vector3(2.6, 1.9, 2.4));
  pushBoxFrame(visionValues, new THREE.Vector3(8.2, 0.8, -7.3), new THREE.Vector3(1.1, 1.35, 1.0));
  pushBoxFrame(visionValues, new THREE.Vector3(9.0, 0.32, -8.0), new THREE.Vector3(0.68, 0.55, 0.82));

  const flowRoutes: FlowRoute[] = [
    {
      event: "tensor",
      phase: 0.0,
      curve: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-12.2, 2.0, -8.4),
        new THREE.Vector3(-8.2, 1.5, -7.8),
        new THREE.Vector3(-5.1, 0.6, -8.4),
        new THREE.Vector3(-2.4, 0.2, -10.2),
      ]),
    },
    {
      event: "vector",
      phase: 0.18,
      curve: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-2.8, -0.3, -9.7),
        new THREE.Vector3(0.7, -1.8, -8.5),
        new THREE.Vector3(3.2, -2.25, -7.7),
        new THREE.Vector3(5.9, -2.0, -8.9),
      ]),
    },
    {
      event: "attention",
      phase: 0.34,
      curve: new THREE.CatmullRomCurve3([
        new THREE.Vector3(5.6, -1.8, -8.9),
        new THREE.Vector3(6.9, -0.2, -9.6),
        new THREE.Vector3(5.4, 2.0, -11.4),
        new THREE.Vector3(1.6, 3.0, -13.6),
      ]),
    },
    {
      event: "vision",
      phase: 0.48,
      curve: new THREE.CatmullRomCurve3([
        new THREE.Vector3(10.9, 2.0, -8.6),
        new THREE.Vector3(9.1, 1.1, -7.7),
        new THREE.Vector3(8.1, 0.5, -7.8),
        new THREE.Vector3(6.2, -0.4, -9.2),
      ]),
    },
    {
      event: "agent",
      phase: 0.62,
      curve: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-4.0, -3.9, -8.0),
        new THREE.Vector3(-1.4, -4.6, -8.8),
        new THREE.Vector3(1.2, -4.2, -9.8),
        new THREE.Vector3(3.8, -3.8, -8.8),
      ]),
    },
  ];

  const flowTubeGeometries = flowRoutes.map((route) => new THREE.TubeGeometry(route.curve, 64, 0.015, 5, false));
  const agentModulePositions = [
    new THREE.Vector3(-4.1, -3.85, -8.2),
    new THREE.Vector3(-2.1, -4.55, -8.7),
    new THREE.Vector3(0.1, -4.72, -9.2),
    new THREE.Vector3(2.1, -4.38, -8.7),
    new THREE.Vector3(4.0, -3.84, -8.3),
  ];

  return {
    architectureGeometry: makeGeometry(architectureValues),
    embeddingGeometry: makeGeometry(embeddingValues),
    activeEmbeddingPositions,
    tensorPositions,
    tensorSeeds,
    flowRoutes,
    flowTubeGeometries,
    visionGeometry: makeGeometry(visionValues),
    agentModulePositions,
  };
}

function useWindowPointer(enabled: boolean) {
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) return;
    const update = (event: PointerEvent) => {
      pointer.current.x = event.clientX / window.innerWidth - 0.5;
      pointer.current.y = event.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("pointermove", update, { passive: true });
    return () => window.removeEventListener("pointermove", update);
  }, [enabled]);

  return pointer;
}

function FieldPlane({
  event,
  opacity,
  density,
  variant,
  position,
  rotation,
  scale,
  reducedMotion,
}: {
  event: EventKind;
  opacity: number;
  density: number;
  variant: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  reducedMotion: boolean;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uActivation: { value: 0 },
      uOpacity: { value: opacity },
      uDensity: { value: density },
      uVariant: { value: variant },
    }),
    [density, opacity, variant]
  );

  useFrame(({ clock }) => {
    const time = reducedMotion ? 6.2 + variant : clock.elapsedTime;
    const weights = getEventWeights(time);
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uTime.value = time;
    material.uniforms.uActivation.value = eventWeight(weights, event);
  });

  return (
    <mesh position={position} rotation={rotation} scale={scale} frustumCulled={false}>
      <planeGeometry args={[1, 1, 72, 42]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={fieldVertexShader}
        fragmentShader={fieldFragmentShader}
      />
    </mesh>
  );
}

function ComputeChamber({ reducedMotion }: { reducedMotion: boolean }) {
  const data = useMemo(() => createComputeData(), []);
  const pointer = useWindowPointer(!reducedMotion);
  const deepRef = useRef<THREE.Group>(null);
  const midRef = useRef<THREE.Group>(null);
  const nearRef = useRef<THREE.Group>(null);
  const tensorRef = useRef<THREE.InstancedMesh>(null);
  const packetsRef = useRef<THREE.InstancedMesh>(null);
  const activeEmbeddingRef = useRef<THREE.InstancedMesh>(null);
  const agentRef = useRef<THREE.InstancedMesh>(null);
  const visionMaterialRef = useRef<THREE.LineBasicMaterial>(null);
  const architectureMaterialRef = useRef<THREE.LineBasicMaterial>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const temp = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const time = reducedMotion ? 6.2 : clock.elapsedTime;
    const weights = getEventWeights(time);
    const pointerX = pointer.current.x;
    const pointerY = pointer.current.y;

    if (deepRef.current) {
      deepRef.current.position.x = THREE.MathUtils.lerp(deepRef.current.position.x, pointerX * 0.16, 0.035);
      deepRef.current.position.y = THREE.MathUtils.lerp(deepRef.current.position.y, -pointerY * 0.08, 0.035);
      deepRef.current.rotation.y = THREE.MathUtils.lerp(deepRef.current.rotation.y, pointerX * 0.025, 0.035);
    }
    if (midRef.current) {
      midRef.current.position.x = THREE.MathUtils.lerp(midRef.current.position.x, pointerX * 0.36, 0.045);
      midRef.current.position.y = THREE.MathUtils.lerp(midRef.current.position.y, -pointerY * 0.16, 0.045);
      midRef.current.rotation.y = THREE.MathUtils.lerp(midRef.current.rotation.y, pointerX * 0.055, 0.045);
    }
    if (nearRef.current) {
      nearRef.current.position.x = THREE.MathUtils.lerp(nearRef.current.position.x, pointerX * 0.58, 0.055);
      nearRef.current.position.y = THREE.MathUtils.lerp(nearRef.current.position.y, -pointerY * 0.26, 0.055);
      nearRef.current.rotation.y = THREE.MathUtils.lerp(nearRef.current.rotation.y, pointerX * 0.082, 0.055);
    }

    if (architectureMaterialRef.current) {
      architectureMaterialRef.current.opacity = 0.08 + weights.tensor * 0.08 + weights.agent * 0.035;
    }
    if (visionMaterialRef.current) {
      visionMaterialRef.current.opacity = 0.05 + weights.vision * 0.34;
    }

    if (tensorRef.current) {
      data.tensorPositions.forEach((position, index) => {
        const seed = data.tensorSeeds[index];
        const ripple = Math.max(0, Math.sin(time * 1.2 + seed * 0.43));
        const stage = Math.max(0, Math.sin(weights.tensor * Math.PI + seed * 0.071));
        const lit = 0.2 + ripple * 0.24 + weights.tensor * stage * 1.1;
        dummy.position.copy(position);
        dummy.scale.set(0.22 + lit * 0.06, 0.018 + lit * 0.018, 0.075 + lit * 0.065);
        dummy.rotation.set(0.02, 0, 0);
        dummy.updateMatrix();
        tensorRef.current!.setMatrixAt(index, dummy.matrix);
      });
      tensorRef.current.instanceMatrix.needsUpdate = true;
    }

    if (activeEmbeddingRef.current) {
      data.activeEmbeddingPositions.forEach((position, index) => {
        const pulse = Math.max(0, Math.sin(time * 2.0 + index * 0.49));
        const scale = weights.vector > 0.03 ? 0.025 + weights.vector * (0.09 + pulse * 0.035) : 0.001;
        dummy.position.copy(position);
        dummy.scale.set(scale * 1.7, scale * 0.7, scale * 1.1);
        dummy.updateMatrix();
        activeEmbeddingRef.current!.setMatrixAt(index, dummy.matrix);
      });
      activeEmbeddingRef.current.instanceMatrix.needsUpdate = true;
    }

    if (packetsRef.current) {
      let packetIndex = 0;
      data.flowRoutes.forEach((route, routeIndex) => {
        const activation = eventWeight(weights, route.event);
        for (let packet = 0; packet < 7; packet += 1) {
          const t = (time * 0.045 + route.phase + packet * 0.115 + routeIndex * 0.08) % 1;
          route.curve.getPointAt(t, temp);
          const scale = activation > 0.025 ? 0.055 + activation * 0.08 : 0.001;
          dummy.position.copy(temp);
          dummy.scale.set(scale * 2.8, scale * 0.42, scale * 0.42);
          dummy.rotation.set(0, t * Math.PI * 2, 0.2);
          dummy.updateMatrix();
          packetsRef.current!.setMatrixAt(packetIndex, dummy.matrix);
          packetIndex += 1;
        }
      });
      packetsRef.current.instanceMatrix.needsUpdate = true;
    }

    if (agentRef.current) {
      data.agentModulePositions.forEach((position, index) => {
        const sequence = Math.max(0, Math.sin(weights.agent * Math.PI + index * 0.52));
        const scale = 0.16 + weights.agent * sequence * 0.16;
        dummy.position.copy(position);
        dummy.scale.set(scale * 2.8, scale * 0.42, scale * 1.2);
        dummy.rotation.set(0, 0.12, 0);
        dummy.updateMatrix();
        agentRef.current!.setMatrixAt(index, dummy.matrix);
      });
      agentRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <fog attach="fog" args={["#080806", 13, 42]} />

      <group ref={deepRef} frustumCulled={false}>
        <FieldPlane
          event="ambient"
          opacity={0.22}
          density={1.7}
          variant={0.4}
          position={[4.2, 3.2, -20.0]}
          rotation={[-0.12, -0.48, 0.04]}
          scale={[17.5, 6.1, 1]}
          reducedMotion={reducedMotion}
        />
        <FieldPlane
          event="attention"
          opacity={0.38}
          density={1.15}
          variant={1.8}
          position={[2.2, 1.1, -14.0]}
          rotation={[0.05, -0.34, 0.035]}
          scale={[12.0, 4.1, 1]}
          reducedMotion={reducedMotion}
        />
        <lineSegments geometry={data.architectureGeometry} frustumCulled={false}>
          <lineBasicMaterial
            ref={architectureMaterialRef}
            color="#cca96a"
            transparent
            opacity={0.1}
            depthWrite={false}
          />
        </lineSegments>
      </group>

      <group ref={midRef} frustumCulled={false}>
        <FieldPlane
          event="tensor"
          opacity={0.42}
          density={1.35}
          variant={3.1}
          position={[-5.2, 0.45, -8.8]}
          rotation={[0.02, 0.32, -0.04]}
          scale={[8.8, 3.0, 1]}
          reducedMotion={reducedMotion}
        />
        <FieldPlane
          event="vision"
          opacity={0.28}
          density={1.8}
          variant={5.6}
          position={[8.4, 0.9, -7.8]}
          rotation={[0.03, -0.42, 0.02]}
          scale={[3.2, 2.2, 1]}
          reducedMotion={reducedMotion}
        />

        {data.flowTubeGeometries.map((geometry, index) => (
          <mesh key={index} geometry={geometry} frustumCulled={false}>
            <meshBasicMaterial
              color={index === 3 ? "#e7d8b7" : "#cca96a"}
              transparent
              opacity={index === 0 ? 0.12 : 0.16}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}

        <instancedMesh
          ref={tensorRef}
          args={[undefined, undefined, data.tensorPositions.length]}
          frustumCulled={false}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color="#d8bf83"
            transparent
            opacity={0.3}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </instancedMesh>

        <points geometry={data.embeddingGeometry} frustumCulled={false}>
          <pointsMaterial
            color="#ece3d1"
            size={0.011}
            sizeAttenuation
            transparent
            opacity={0.46}
            depthWrite={false}
          />
        </points>

        <lineSegments geometry={data.visionGeometry} frustumCulled={false}>
          <lineBasicMaterial
            ref={visionMaterialRef}
            color="#ece3d1"
            transparent
            opacity={0.08}
            depthWrite={false}
          />
        </lineSegments>
      </group>

      <group ref={nearRef} frustumCulled={false}>
        <instancedMesh
          ref={packetsRef}
          args={[undefined, undefined, data.flowRoutes.length * 7]}
          frustumCulled={false}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color="#fff6dc"
            transparent
            opacity={0.86}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </instancedMesh>

        <instancedMesh
          ref={activeEmbeddingRef}
          args={[undefined, undefined, data.activeEmbeddingPositions.length]}
          frustumCulled={false}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color="#fff6dc"
            transparent
            opacity={0.78}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </instancedMesh>

        <instancedMesh
          ref={agentRef}
          args={[undefined, undefined, data.agentModulePositions.length]}
          frustumCulled={false}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color="#cca96a"
            transparent
            opacity={0.28}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </instancedMesh>
      </group>
    </>
  );
}

function AIChamberCanvas() {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="ai-world-canvas">
      <Canvas
        dpr={[1, 1.5]}
        frameloop={reducedMotion ? "demand" : "always"}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [0.2, -0.05, 10.5], fov: 46, near: 0.1, far: 64 }}
      >
        <ambientLight intensity={0.08} />
        <ComputeChamber reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}

export default function HeroAIWorld() {
  return (
    <div className="hero-ai-world" aria-hidden="true">
      <AIChamberCanvas />

      <div className="ai-world-instrumentation">
        {labelItems.map((label) => (
          <span key={label.className} className={`ai-world-label ${label.className}`}>
            {label.text}
          </span>
        ))}
      </div>

      <div className="ai-glass-surface" />
      <div className="ai-readability-mask" />
    </div>
  );
}
