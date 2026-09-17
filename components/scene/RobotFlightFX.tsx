"use client";

/* eslint-disable react-hooks/immutability -- Three.js materials, buffers, vectors, and instanced meshes are mutable runtime objects. */

import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject, RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export type RobotFlightPhase =
  | "idle"
  | "charge"
  | "launch"
  | "flight"
  | "approach"
  | "precision"
  | "return"
  | "landing";

export interface RobotFlightFxState {
  phase: RobotFlightPhase;
  intensity: number;
  precisionActive: boolean;
  launchPulse: number;
  landingPulse: number;
}

interface TrailSample {
  position: THREE.Vector3;
  life: number;
  speed: number;
  seed: number;
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  scale: number;
  stretch: number;
  spin: number;
}

interface RobotFlightFXProps {
  robotRef: RefObject<THREE.Group | null>;
  scene: THREE.Object3D;
  stateRef: MutableRefObject<RobotFlightFxState>;
  compact?: boolean;
  reducedMotion?: boolean;
  debug?: boolean;
}

const FOOT_NAMES = [
  "mixamorig:LeftFoot",
  "mixamorig:LeftToeBase",
  "mixamorigLeftFoot",
  "mixamorigLeftToeBase",
];
const RIGHT_FOOT_NAMES = [
  "mixamorig:RightFoot",
  "mixamorig:RightToeBase",
  "mixamorigRightFoot",
  "mixamorigRightToeBase",
];
const BACK_NAMES = [
  "mixamorig:Spine2",
  "mixamorig:Spine1",
  "mixamorig:Hips",
  "mixamorigSpine2",
  "mixamorigSpine1",
  "mixamorigHips",
];

const additiveBlending = THREE.AdditiveBlending;
const zeroScale = new THREE.Vector3(0, 0, 0);
const unitZ = new THREE.Vector3(0, 0, 1);
const debugTrailPointCount = 60;

export function createRobotFlightFxState(): RobotFlightFxState {
  return {
    phase: "idle",
    intensity: 0,
    precisionActive: false,
    launchPulse: 0,
    landingPulse: 0,
  };
}

function findAnchor(scene: THREE.Object3D, names: string[]) {
  for (const name of names) {
    const object = scene.getObjectByName(name);
    if (object) return object;
  }

  const lowerNames = names.map((name) => name.toLowerCase());
  let fallback: THREE.Object3D | null = null;
  scene.traverse((object) => {
    if (fallback) return;
    const objectName = object.name.toLowerCase();
    if (lowerNames.some((name) => objectName.endsWith(name.replace("mixamorig:", "")))) {
      fallback = object;
    }
  });

  return fallback;
}

function tempVector() {
  return new THREE.Vector3();
}

function makeParticles(count: number) {
  return Array.from({ length: count }, () => ({
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    life: 0,
    maxLife: 1,
    scale: 0,
    stretch: 1,
    spin: 0,
  }));
}

function disposeGeometry(mesh: THREE.Mesh | THREE.Line | null) {
  if (mesh?.geometry) mesh.geometry.dispose();
}

function assignGeometry(mesh: THREE.Mesh | null, geometry: THREE.BufferGeometry | null) {
  if (!mesh) {
    geometry?.dispose();
    return;
  }
  disposeGeometry(mesh);
  if (!geometry) {
    mesh.visible = false;
    return;
  }
  mesh.geometry = geometry;
  mesh.visible = true;
}

function createFireMaterial(opacity: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: additiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: opacity },
      uFlowSpeed: { value: 1.6 },
    },
    vertexShader: `
      attribute float aAlpha;
      attribute float aHeat;
      varying vec2 vUv;
      varying float vAlpha;
      varying float vHeat;

      void main() {
        vUv = uv;
        vAlpha = aAlpha;
        vHeat = aHeat;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;

      uniform float uTime;
      uniform float uOpacity;
      uniform float uFlowSpeed;
      varying vec2 vUv;
      varying float vAlpha;
      varying float vHeat;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 4; i++) {
          value += amplitude * noise(p);
          p *= 2.02;
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        float edge = smoothstep(0.0, 0.14, vUv.y) * (1.0 - smoothstep(0.86, 1.0, vUv.y));
        float ageFade = 1.0 - smoothstep(0.9, 1.0, vUv.x);
        float flow = uTime * uFlowSpeed;
        float n = fbm(vec2(vUv.x * 5.5 - flow, vUv.y * 9.0 + sin(uTime * 1.7)));
        float tongues = smoothstep(0.18, 0.98, n + (1.0 - vUv.x) * 0.24);
        float alpha = edge * ageFade * vAlpha * (0.58 + 0.82 * tongues) * uOpacity;
        if (alpha < 0.018) discard;

        vec3 deep = vec3(0.62, 0.055, 0.012);
        vec3 outer = vec3(1.0, 0.24, 0.035);
        vec3 amber = vec3(1.0, 0.42, 0.055);
        vec3 hot = vec3(1.0, 0.62, 0.16);
        vec3 core = vec3(1.0, 0.975, 0.84);
        float heat = clamp(vHeat + (1.0 - vUv.x) * 0.24 + n * 0.24, 0.0, 1.0);
        vec3 color = mix(deep, outer, smoothstep(0.04, 0.32, heat));
        color = mix(color, amber, smoothstep(0.28, 0.58, heat));
        color = mix(color, hot, smoothstep(0.52, 0.78, heat));
        color = mix(color, core, smoothstep(0.78, 1.0, heat));

        gl_FragColor = vec4(color * (1.0 + heat * 0.55), alpha);
      }
    `,
  });
}

function createSmokeMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
    },
    vertexShader: `
      attribute float aAlpha;
      varying vec2 vUv;
      varying float vAlpha;

      void main() {
        vUv = uv;
        vAlpha = aAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;

      uniform float uTime;
      uniform float uOpacity;
      varying vec2 vUv;
      varying float vAlpha;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(91.7, 271.3))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      void main() {
        float edge = smoothstep(0.0, 0.22, vUv.y) * (1.0 - smoothstep(0.78, 1.0, vUv.y));
        float tail = smoothstep(0.12, 0.72, vUv.x) * (1.0 - smoothstep(0.94, 1.0, vUv.x));
        float n = noise(vec2(vUv.x * 4.0 - uTime * 0.24, vUv.y * 5.5 + uTime * 0.17));
        float alpha = edge * tail * vAlpha * uOpacity * smoothstep(0.18, 0.92, n);
        if (alpha < 0.01) discard;
        vec3 color = mix(vec3(0.035, 0.032, 0.03), vec3(0.16, 0.12, 0.08), n * 0.45);
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
}

function readAnchor(
  anchor: THREE.Object3D | null,
  fallback: THREE.Vector3,
  target: THREE.Vector3
) {
  if (!anchor) return target.copy(fallback);
  anchor.getWorldPosition(target);
  return target;
}

function basisFromDirection(
  direction: THREE.Vector3,
  cameraDirection: THREE.Vector3,
  side: THREE.Vector3,
  up: THREE.Vector3
) {
  side.crossVectors(cameraDirection, direction);
  if (side.lengthSq() < 0.000001) side.set(1, 0, 0);
  side.normalize();
  up.crossVectors(direction, side);
  if (up.lengthSq() < 0.000001) up.set(0, 1, 0);
  up.normalize();
}

function buildTrailRibbonGeometry({
  samples,
  camera,
  time,
  intensity,
  speed01,
  width,
  core = false,
  smoke = false,
}: {
  samples: TrailSample[];
  camera: THREE.Camera;
  time: number;
  intensity: number;
  speed01: number;
  width: number;
  core?: boolean;
  smoke?: boolean;
}) {
  if (samples.length < 3 || intensity <= 0.015) return null;

  const points = samples.map((sample) => sample.position);
  const curve = new THREE.CatmullRomCurve3(points);
  const steps = THREE.MathUtils.clamp(samples.length * 3, 10, smoke ? 38 : 54);
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection).normalize();

  const positions: number[] = [];
  const uvs: number[] = [];
  const alphas: number[] = [];
  const heats: number[] = [];
  const indices: number[] = [];
  const tangent = new THREE.Vector3();
  const center = new THREE.Vector3();
  const side = new THREE.Vector3();
  const up = new THREE.Vector3();

  for (let i = 0; i < steps; i += 1) {
    const u = i / (steps - 1);
    curve.getPoint(u, center);
    curve.getTangent(u, tangent).normalize();
    basisFromDirection(tangent, cameraDirection, side, up);

    const nearest = samples[Math.min(samples.length - 1, Math.round(u * (samples.length - 1)))];
    const tailFade = 1 - u;
    const lifeFade = THREE.MathUtils.clamp(nearest.life, 0, 1);
    const wave =
      Math.sin(time * 9.1 + u * 18.0 + nearest.seed * 6.28) * 0.55 +
      Math.sin(time * 14.7 + u * 31.0 + nearest.seed * 3.1) * 0.35;
    const ripple = 1 + wave * (smoke ? 0.24 : 0.68);
    const ageWidth = smoke
      ? (0.35 + u * 0.9) * (0.65 + tailFade * 0.35)
      : 0.12 + Math.pow(tailFade, core ? 1.55 : 0.82) * 0.96;
    const localWidth = width * ageWidth * ripple * (0.72 + speed01 * 0.34);
    const centerLift =
      Math.sin(time * 7.0 + u * 16.0 + nearest.seed * 9.0) *
      width *
      (smoke ? 0.34 : 0.52);

    center.addScaledVector(up, centerLift);

    const alpha = THREE.MathUtils.clamp(
      lifeFade * tailFade * (smoke ? 0.7 : 1) * (0.4 + intensity * 0.72),
      0,
      1
    );
    const heat = core
      ? 0.74 + tailFade * 0.12
      : THREE.MathUtils.clamp(0.02 + tailFade * 0.22 + speed01 * 0.05, 0, 0.42);

    const baseIndex = positions.length / 3;
    for (const sideSign of [-1, 1]) {
      const vertex = center.clone().addScaledVector(side, localWidth * sideSign);
      positions.push(vertex.x, vertex.y, vertex.z);
      uvs.push(u, sideSign < 0 ? 0 : 1);
      alphas.push(alpha);
      heats.push(heat);
    }

    if (i > 0) {
      indices.push(baseIndex - 2, baseIndex - 1, baseIndex);
      indices.push(baseIndex - 1, baseIndex + 1, baseIndex);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("aAlpha", new THREE.Float32BufferAttribute(alphas, 1));
  geometry.setAttribute("aHeat", new THREE.Float32BufferAttribute(heats, 1));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

function buildThrusterRibbonGeometry({
  anchors,
  direction,
  camera,
  time,
  length,
  width,
  alpha,
  heat,
  seed,
}: {
  anchors: THREE.Vector3[];
  direction: THREE.Vector3;
  camera: THREE.Camera;
  time: number;
  length: number;
  width: number;
  alpha: number;
  heat: number;
  seed: number;
}) {
  if (anchors.length === 0 || length <= 0.015 || width <= 0.004 || alpha <= 0.01) {
    return null;
  }

  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection).normalize();
  const positions: number[] = [];
  const uvs: number[] = [];
  const alphas: number[] = [];
  const heats: number[] = [];
  const indices: number[] = [];
  const side = new THREE.Vector3();
  const up = new THREE.Vector3();
  const center = new THREE.Vector3();

  basisFromDirection(direction, cameraDirection, side, up);

  const addRibbon = (
    origin: THREE.Vector3,
    sideAxis: THREE.Vector3,
    upAxis: THREE.Vector3,
    planeSeed: number
  ) => {
    const segments = 9;
    for (let i = 0; i < segments; i += 1) {
      const u = i / (segments - 1);
      const body = Math.sin(Math.PI * u);
      const taper = Math.max(0.02, Math.pow(body, 0.58) * (1 - u * 0.2));
      const flameWidth = width * (0.12 + taper * 0.96);
      const lick =
        Math.sin(time * 18.0 + u * 16.0 + planeSeed * 5.7) * 0.45 +
        Math.sin(time * 27.0 + u * 33.0 + planeSeed * 2.3) * 0.28;
      center
        .copy(origin)
        .addScaledVector(direction, length * u)
        .addScaledVector(sideAxis, lick * width * taper * 0.3)
        .addScaledVector(
          upAxis,
          Math.cos(time * 15.0 + u * 20.0 + planeSeed) * width * taper * 0.18
        );

      const localAlpha = alpha * (1 - u * 0.82) * (0.65 + body * 0.62);
      const localHeat = THREE.MathUtils.clamp(heat + (1 - u) * 0.24 + body * 0.1, 0, 1);
      const baseIndex = positions.length / 3;

      for (const sideSign of [-1, 1]) {
        const vertex = center
          .clone()
          .addScaledVector(sideAxis, flameWidth * sideSign)
          .addScaledVector(upAxis, lick * width * 0.06 * sideSign);
        positions.push(vertex.x, vertex.y, vertex.z);
        uvs.push(u, sideSign < 0 ? 0 : 1);
        alphas.push(localAlpha);
        heats.push(localHeat);
      }

      if (i > 0) {
        indices.push(baseIndex - 2, baseIndex - 1, baseIndex);
        indices.push(baseIndex - 1, baseIndex + 1, baseIndex);
      }
    }
  };

  anchors.forEach((origin, index) => {
    addRibbon(origin, side, up, seed + index * 0.37);
    addRibbon(origin, up, side, seed + index * 0.53 + 1.7);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("aAlpha", new THREE.Float32BufferAttribute(alphas, 1));
  geometry.setAttribute("aHeat", new THREE.Float32BufferAttribute(heats, 1));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

function updateDebugLine(
  line: THREE.Line | null,
  start: THREE.Vector3,
  end: THREE.Vector3
) {
  if (!line) return;
  disposeGeometry(line);
  line.geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  line.visible = true;
}

export default function RobotFlightFX({
  robotRef,
  scene,
  stateRef,
  compact = false,
  reducedMotion = false,
  debug = false,
}: RobotFlightFXProps) {
  const { camera } = useThree();
  const fireTrailRef = useRef<THREE.Mesh>(null);
  const coreTrailRef = useRef<THREE.Mesh>(null);
  const smokeTrailRef = useRef<THREE.Mesh>(null);
  const thrusterOuterRef = useRef<THREE.Mesh>(null);
  const thrusterMidRef = useRef<THREE.Mesh>(null);
  const thrusterCoreRef = useRef<THREE.Mesh>(null);
  const launchRingRef = useRef<THREE.Mesh>(null);
  const landingRingRef = useRef<THREE.Mesh>(null);
  const sparkMeshRef = useRef<THREE.InstancedMesh>(null);
  const emberMeshRef = useRef<THREE.InstancedMesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const debugTrailRef = useRef<THREE.InstancedMesh>(null);
  const debugAnchorRef = useRef<THREE.InstancedMesh>(null);

  const previousRoot = useRef(new THREE.Vector3());
  const previousSpeed = useRef(0);
  const lastTrailPoint = useRef(new THREE.Vector3());
  const trail = useRef<TrailSample[]>([]);
  const initialized = useRef(false);
  const elapsedTime = useRef(0);
  const lastSampleAt = useRef(0);
  const previousPhase = useRef<RobotFlightPhase>("idle");
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const baseCameraPosition = useRef<THREE.Vector3 | null>(null);
  const cameraTarget = useMemo(() => new THREE.Vector3(0, -0.25, 0), []);

  const particleCount = compact ? 70 : 128;
  const emberCount = compact ? 46 : 84;
  const sparks = useRef<Particle[]>(makeParticles(particleCount));
  const embers = useRef<Particle[]>(makeParticles(emberCount));

  const anchors = useMemo(
    () => ({
      leftFoot: findAnchor(scene, FOOT_NAMES),
      rightFoot: findAnchor(scene, RIGHT_FOOT_NAMES),
      back: findAnchor(scene, BACK_NAMES),
    }),
    [scene]
  );

  const materials = useMemo(
    () => ({
      trail: createFireMaterial(0.78),
      coreTrail: createFireMaterial(0.52),
      thrusterOuter: createFireMaterial(0.9),
      thrusterMid: createFireMaterial(0.82),
      thrusterCore: createFireMaterial(0.7),
      smoke: createSmokeMaterial(),
      spark: new THREE.MeshBasicMaterial({
        color: "#fff6d5",
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: additiveBlending,
      }),
      ember: new THREE.MeshBasicMaterial({
        color: "#ef5a1b",
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
        blending: additiveBlending,
      }),
      ring: new THREE.MeshBasicMaterial({
        color: "#fff1b0",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: additiveBlending,
      }),
      debugVelocity: new THREE.LineBasicMaterial({
        color: "#31ff5a",
        transparent: true,
        opacity: 0.9,
        depthTest: false,
      }),
      debugFlame: new THREE.LineBasicMaterial({
        color: "#ff7a1a",
        transparent: true,
        opacity: 0.9,
        depthTest: false,
      }),
      debugPoint: new THREE.MeshBasicMaterial({
        color: "#fff6d5",
        depthTest: false,
      }),
      debugAnchor: new THREE.MeshBasicMaterial({
        color: "#31a8ff",
        depthTest: false,
      }),
    }),
    []
  );
  const debugVelocityLine = useMemo(
    () => new THREE.Line(new THREE.BufferGeometry(), materials.debugVelocity),
    [materials.debugVelocity]
  );
  const debugFlameLine = useMemo(
    () => new THREE.Line(new THREE.BufferGeometry(), materials.debugFlame),
    [materials.debugFlame]
  );

  const temp = useMemo(
    () => ({
      root: tempVector(),
      source: tempVector(),
      leftFoot: tempVector(),
      rightFoot: tempVector(),
      back: tempVector(),
      velocity: tempVector(),
      direction: tempVector(),
      flameDirection: tempVector(),
      burstDirection: tempVector(),
      random: tempVector(),
      cameraOffset: tempVector(),
      debugEnd: tempVector(),
    }),
    []
  );

  useEffect(() => {
    sparks.current = makeParticles(particleCount);
    embers.current = makeParticles(emberCount);
  }, [emberCount, particleCount]);

  useEffect(() => {
    const meshes = [
      fireTrailRef.current,
      coreTrailRef.current,
      smokeTrailRef.current,
      thrusterOuterRef.current,
      thrusterMidRef.current,
      thrusterCoreRef.current,
      debugVelocityLine,
      debugFlameLine,
    ];

    return () => {
      Object.values(materials).forEach((material) => material.dispose());
      meshes.forEach((mesh) => disposeGeometry(mesh));
    };
  }, [debugFlameLine, debugVelocityLine, materials]);

  const emitParticles = (
    particles: Particle[],
    source: THREE.Vector3,
    direction: THREE.Vector3,
    count: number,
    speed: number,
    ember: boolean,
    radial = false
  ) => {
    for (let emitted = 0; emitted < count; emitted += 1) {
      const particle = particles.find((item) => item.life <= 0);
      if (!particle) return;

      particle.position.copy(source);
      temp.random.set(
        (Math.random() - 0.5) * (radial ? 1.2 : 0.42),
        (Math.random() - 0.5) * (radial ? 0.9 : 0.34),
        (Math.random() - 0.5) * (radial ? 0.8 : 0.3)
      );

      if (radial && temp.random.lengthSq() > 0.000001) {
        temp.burstDirection.copy(temp.random).normalize();
      } else {
        temp.burstDirection.copy(direction);
      }

      particle.velocity
        .copy(temp.burstDirection)
        .multiplyScalar((ember ? 0.82 : 1.55) + Math.random() * (ember ? 0.7 : 1.85))
        .add(temp.random.multiplyScalar(ember ? 0.5 : 0.75))
        .multiplyScalar(THREE.MathUtils.clamp(speed * 0.42, 0.75, radial ? 3.9 : 2.8));
      particle.maxLife = ember
        ? 0.45 + Math.random() * 0.55
        : 0.22 + Math.random() * 0.48;
      particle.life = particle.maxLife;
      particle.scale = ember
        ? 0.019 + Math.random() * 0.044
        : 0.014 + Math.random() * 0.03;
      particle.stretch = ember
        ? 0.9 + Math.random() * 1.7
        : 3.3 + Math.random() * 6.8;
      particle.spin = Math.random() * Math.PI * 2;
    }
  };

  const updateParticleMesh = (
    mesh: THREE.InstancedMesh | null,
    particles: Particle[],
    delta: number,
    streaks: boolean
  ) => {
    if (!mesh) return 0;
    let alive = 0;

    particles.forEach((particle, index) => {
      if (particle.life > 0) {
        particle.life -= delta;
        particle.position.addScaledVector(particle.velocity, delta);
        particle.velocity.multiplyScalar(1 - Math.min(0.08, delta * 1.65));
        alive += 1;

        const normalizedLife = Math.max(0, particle.life / particle.maxLife);
        dummy.position.copy(particle.position);
        if (streaks && particle.velocity.lengthSq() > 0.000001) {
          dummy.quaternion.setFromUnitVectors(
            unitZ,
            temp.random.copy(particle.velocity).normalize()
          );
          dummy.rotateZ(particle.spin);
          dummy.scale.set(
            particle.scale * normalizedLife * 0.42,
            particle.scale * normalizedLife * 0.42,
            particle.scale * particle.stretch * normalizedLife
          );
        } else {
          dummy.rotation.set(particle.spin, particle.spin * 0.7, particle.spin * 1.3);
          dummy.scale.setScalar(particle.scale * normalizedLife);
        }
      } else {
        dummy.position.set(0, -99, 0);
        dummy.scale.copy(zeroScale);
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    return alive;
  };

  useFrame((_, rawDelta) => {
    const robot = robotRef.current;
    if (!robot) return;

    const delta = Math.min(rawDelta, 0.05);
    elapsedTime.current += delta;
    const time = elapsedTime.current;

    if (!baseCameraPosition.current) {
      baseCameraPosition.current = camera.position.clone();
    }

    const state = stateRef.current;
    const motionAllowed = !reducedMotion;
    const targetIntensity = motionAllowed ? state.intensity : 0;
    const intensity = THREE.MathUtils.clamp(targetIntensity, 0, 1.35);
    const active =
      intensity > 0.015 &&
      state.phase !== "idle" &&
      state.phase !== "precision" &&
      !state.precisionActive;

    robot.updateWorldMatrix(true, true);
    scene.updateWorldMatrix(true, true);
    robot.getWorldPosition(temp.root);

    if (!initialized.current) {
      previousRoot.current.copy(temp.root);
      lastTrailPoint.current.copy(temp.root);
      initialized.current = true;
    }

    temp.velocity.copy(temp.root).sub(previousRoot.current);
    const speed = temp.velocity.length() / Math.max(0.001, delta);
    const acceleration = (speed - previousSpeed.current) / Math.max(0.001, delta);
    const speed01 = THREE.MathUtils.clamp(speed / (compact ? 4.0 : 4.8), 0, 1.4);
    const accel01 = THREE.MathUtils.clamp(Math.max(0, acceleration) / 12, 0, 1);
    temp.direction.copy(temp.velocity);
    if (temp.direction.lengthSq() < 0.000001) {
      temp.direction.set(0, 0.1, -1);
    } else {
      temp.direction.normalize();
    }
    temp.flameDirection.copy(temp.direction).multiplyScalar(-1);

    readAnchor(anchors.leftFoot, temp.root, temp.leftFoot);
    readAnchor(anchors.rightFoot, temp.root, temp.rightFoot);
    readAnchor(anchors.back, temp.root, temp.back);
    temp.source.copy(temp.leftFoot).add(temp.rightFoot).multiplyScalar(0.5);
    temp.source.lerp(temp.back, 0.18);

    if (active) {
      const movedEnough = temp.source.distanceTo(lastTrailPoint.current) > (compact ? 0.018 : 0.016);
      const timedEnough = time - lastSampleAt.current > 0.035;
      if (movedEnough || timedEnough || trail.current.length === 0) {
        trail.current.unshift({
          position: temp.source.clone(),
          life: 1,
          speed,
          seed: Math.random(),
        });
        lastTrailPoint.current.copy(temp.source);
        lastSampleAt.current = time;
      }
    }

    const braking =
      state.phase === "approach" || state.phase === "precision" || state.phase === "landing";
    const lifeDecay = braking ? 1.25 : 0.72 + speed01 * 0.18;
    trail.current.forEach((sample) => {
      sample.life -= delta * lifeDecay;
    });
    const maxTrail = compact ? 38 : 56;
    trail.current = trail.current
      .filter((sample) => sample.life > 0)
      .slice(0, active ? maxTrail : Math.ceil(maxTrail * 0.65));

    const justLaunched =
      (state.phase === "launch" || state.phase === "return") &&
      previousPhase.current !== state.phase;
    const justLanded = state.phase === "landing" && previousPhase.current !== "landing";

    if (justLaunched) {
      emitParticles(sparks.current, temp.source, temp.flameDirection, compact ? 16 : 26, speed + 2.4, false, true);
      emitParticles(embers.current, temp.source, temp.flameDirection, compact ? 10 : 16, speed + 1.8, true, true);
    }

    if (justLanded) {
      emitParticles(sparks.current, temp.source, temp.flameDirection, compact ? 8 : 14, speed + 0.8, false, true);
      emitParticles(embers.current, temp.source, temp.flameDirection, compact ? 8 : 12, speed + 0.6, true, true);
    }

    if (active && speed > 0.055) {
      const emitScale = compact ? 0.68 : 1;
      const sparkSpawn = Math.min(
        compact ? 5 : 8,
        Math.ceil((1.05 + speed01 * 1.6 + accel01 * 2.0) * intensity * emitScale * delta * 56)
      );
      const emberSpawn = Math.min(
        compact ? 4 : 6,
        Math.ceil((0.82 + speed01 * 1.05) * intensity * emitScale * delta * 42)
      );
      emitParticles(sparks.current, temp.source, temp.flameDirection, sparkSpawn, speed, false);
      emitParticles(embers.current, temp.source, temp.flameDirection, emberSpawn, speed, true);
    }

    const aliveSparks = updateParticleMesh(sparkMeshRef.current, sparks.current, delta, true);
    const aliveEmbers = updateParticleMesh(emberMeshRef.current, embers.current, delta, false);

    const responsive = compact ? 0.72 : 1;
    const trailIntensity =
      active || trail.current.length > 0
        ? THREE.MathUtils.clamp(intensity + speed01 * 0.18, 0, 1.2)
        : 0;
    const trailWidth =
      responsive * (0.075 + speed01 * 0.095 + accel01 * 0.035) * Math.max(0.52, intensity);
    const coreWidth = trailWidth * 0.2;
    const smokeWidth = responsive * (0.075 + speed01 * 0.05);

    assignGeometry(
      fireTrailRef.current,
      buildTrailRibbonGeometry({
        samples: trail.current,
        camera,
        time,
        intensity: trailIntensity,
        speed01,
        width: trailWidth,
      })
    );
    assignGeometry(
      coreTrailRef.current,
      buildTrailRibbonGeometry({
        samples: trail.current.slice(0, Math.max(4, Math.floor(trail.current.length * 0.42))),
        camera,
        time: time + 4.7,
        intensity: trailIntensity * 0.82,
        speed01,
        width: coreWidth,
        core: true,
      })
    );
    assignGeometry(
      smokeTrailRef.current,
      buildTrailRibbonGeometry({
        samples: trail.current.slice(Math.max(0, Math.floor(trail.current.length * 0.18))),
        camera,
        time,
        intensity: trail.current.length > 3 ? Math.max(0.12, trailIntensity) : 0,
        speed01,
        width: smokeWidth,
        smoke: true,
      })
    );

    materials.trail.uniforms.uTime.value = time;
    materials.coreTrail.uniforms.uTime.value = time + 1.5;
    materials.thrusterOuter.uniforms.uTime.value = time;
    materials.thrusterMid.uniforms.uTime.value = time + 2.2;
    materials.thrusterCore.uniforms.uTime.value = time + 4.1;
    materials.smoke.uniforms.uTime.value = time;
    materials.trail.uniforms.uOpacity.value = THREE.MathUtils.clamp(0.86 + intensity * 0.32, 0, 1.08);
    materials.coreTrail.uniforms.uOpacity.value = THREE.MathUtils.clamp(0.025 + intensity * 0.08, 0, 0.12);
    materials.smoke.uniforms.uOpacity.value = THREE.MathUtils.clamp(0.035 + speed01 * 0.045, 0, 0.09);

    const flameLength =
      responsive *
      THREE.MathUtils.clamp(
        0.16 + intensity * 0.32 + speed01 * 0.32 + accel01 * 0.18,
        0,
        compact ? 0.68 : 0.92
      );
    const flameWidth =
      responsive *
      THREE.MathUtils.clamp(0.035 + intensity * 0.06 + accel01 * 0.035, 0.01, compact ? 0.12 : 0.16);
    const flameAlpha = active ? THREE.MathUtils.clamp(0.32 + intensity * 0.75, 0, 1.08) : 0;
    const flameAnchors = [temp.leftFoot.clone(), temp.rightFoot.clone()];

    assignGeometry(
      thrusterOuterRef.current,
      buildThrusterRibbonGeometry({
        anchors: flameAnchors,
        direction: temp.flameDirection,
        camera,
        time,
        length: flameLength,
        width: flameWidth * 1.18,
        alpha: flameAlpha,
        heat: 0.24,
        seed: 1.2,
      })
    );
    assignGeometry(
      thrusterMidRef.current,
      buildThrusterRibbonGeometry({
        anchors: flameAnchors,
        direction: temp.flameDirection,
        camera,
        time: time + 0.8,
        length: flameLength * 0.76,
        width: flameWidth * 0.72,
        alpha: flameAlpha * 0.92,
        heat: 0.58,
        seed: 3.8,
      })
    );
    assignGeometry(
      thrusterCoreRef.current,
      buildThrusterRibbonGeometry({
        anchors: flameAnchors,
        direction: temp.flameDirection,
        camera,
        time: time + 1.4,
        length: flameLength * 0.48,
        width: flameWidth * 0.34,
        alpha: flameAlpha * 0.78,
        heat: 0.92,
        seed: 6.1,
      })
    );

    const updateRing = (
      mesh: THREE.Mesh | null,
      pulse: number,
      source: THREE.Vector3,
      landing = false
    ) => {
      if (!mesh) return;
      const value = THREE.MathUtils.clamp(pulse, 0, 1);
      mesh.visible = value > 0.01;
      mesh.position.copy(source);
      mesh.quaternion.copy(camera.quaternion);
      const scale = (landing ? 0.24 : 0.32) + (1 - value) * (landing ? 0.82 : 1.25);
      mesh.scale.setScalar(scale * responsive);
      (mesh.material as THREE.MeshBasicMaterial).opacity = value * (landing ? 0.34 : 0.48);
    };

    updateRing(launchRingRef.current, state.launchPulse, temp.source, false);
    updateRing(landingRingRef.current, state.landingPulse, temp.source, true);
    state.launchPulse = Math.max(0, state.launchPulse - delta * 5.2);
    state.landingPulse = Math.max(0, state.landingPulse - delta * 5.8);

    if (lightRef.current) {
      const pulse = Math.max(state.launchPulse, state.landingPulse);
      lightRef.current.position.copy(temp.source);
      lightRef.current.intensity = motionAllowed
        ? THREE.MathUtils.clamp(intensity * 3.6 + accel01 * 2.4 + pulse * 2.8, 0, compact ? 3.4 : 5.6)
        : 0;
      lightRef.current.distance = compact ? 1.8 : 2.8;
    }

    if (baseCameraPosition.current) {
      const impulse = Math.max(state.launchPulse, state.landingPulse) * (compact ? 0.009 : 0.014);
      temp.cameraOffset
        .copy(baseCameraPosition.current)
        .addScaledVector(temp.flameDirection, impulse);
      camera.position.lerp(temp.cameraOffset, active ? 0.045 : 0.075);
      camera.lookAt(cameraTarget);
    }

    if (!motionAllowed || !active) {
      assignGeometry(thrusterOuterRef.current, null);
      assignGeometry(thrusterMidRef.current, null);
      assignGeometry(thrusterCoreRef.current, null);
    }

    if (debug) {
      updateDebugLine(
        debugVelocityLine,
        temp.root,
        temp.debugEnd.copy(temp.root).addScaledVector(temp.direction, 0.55 + speed01 * 0.22)
      );
      updateDebugLine(
        debugFlameLine,
        temp.source,
        temp.debugEnd.copy(temp.source).addScaledVector(temp.flameDirection, 0.65 + speed01 * 0.3)
      );

      if (debugTrailRef.current) {
        for (let i = 0; i < debugTrailPointCount; i += 1) {
          const sample = trail.current[i];
          if (sample) {
            dummy.position.copy(sample.position);
            dummy.scale.setScalar(0.018 * responsive * Math.max(0.3, sample.life));
          } else {
            dummy.position.set(0, -99, 0);
            dummy.scale.copy(zeroScale);
          }
          dummy.updateMatrix();
          debugTrailRef.current.setMatrixAt(i, dummy.matrix);
        }
        debugTrailRef.current.instanceMatrix.needsUpdate = true;
      }

      if (debugAnchorRef.current) {
        [temp.leftFoot, temp.rightFoot].forEach((anchorPoint, index) => {
          dummy.position.copy(anchorPoint);
          dummy.scale.setScalar(0.04 * responsive);
          dummy.updateMatrix();
          debugAnchorRef.current?.setMatrixAt(index, dummy.matrix);
        });
        debugAnchorRef.current.instanceMatrix.needsUpdate = true;
      }
    } else {
      debugVelocityLine.visible = false;
      debugFlameLine.visible = false;
    }

    if (typeof window !== "undefined") {
      (
        window as Window & {
          __robotFlightFxDebug?: unknown;
        }
      ).__robotFlightFxDebug = {
        phase: state.phase,
        speed: Number(speed.toFixed(3)),
        normalizedSpeed: Number(speed01.toFixed(3)),
        acceleration: Number(acceleration.toFixed(3)),
        intensity: Number(intensity.toFixed(3)),
        trailSampleCount: trail.current.length,
        particleCount: aliveSparks + aliveEmbers,
        sparkCapacity: particleCount,
        emberCapacity: emberCount,
        velocityDirection: [
          Number(temp.direction.x.toFixed(3)),
          Number(temp.direction.y.toFixed(3)),
          Number(temp.direction.z.toFixed(3)),
        ],
        flameDirection: [
          Number(temp.flameDirection.x.toFixed(3)),
          Number(temp.flameDirection.y.toFixed(3)),
          Number(temp.flameDirection.z.toFixed(3)),
        ],
        anchors: {
          leftFoot: [
            Number(temp.leftFoot.x.toFixed(3)),
            Number(temp.leftFoot.y.toFixed(3)),
            Number(temp.leftFoot.z.toFixed(3)),
          ],
          rightFoot: [
            Number(temp.rightFoot.x.toFixed(3)),
            Number(temp.rightFoot.y.toFixed(3)),
            Number(temp.rightFoot.z.toFixed(3)),
          ],
        },
      };
    }

    previousSpeed.current = speed;
    previousRoot.current.copy(temp.root);
    previousPhase.current = state.phase;
  });

  return (
    <group aria-hidden="true">
      <mesh ref={smokeTrailRef} material={materials.smoke} visible={false} />
      <mesh ref={fireTrailRef} material={materials.trail} visible={false} />
      <mesh ref={coreTrailRef} material={materials.coreTrail} visible={false} />

      <mesh ref={thrusterOuterRef} material={materials.thrusterOuter} visible={false} />
      <mesh ref={thrusterMidRef} material={materials.thrusterMid} visible={false} />
      <mesh ref={thrusterCoreRef} material={materials.thrusterCore} visible={false} />

      <mesh ref={launchRingRef} material={materials.ring} visible={false}>
        <ringGeometry args={[0.18, 0.205, 58]} />
      </mesh>
      <mesh ref={landingRingRef} material={materials.ring} visible={false}>
        <ringGeometry args={[0.1, 0.128, 46]} />
      </mesh>

      <instancedMesh ref={sparkMeshRef} args={[undefined, undefined, particleCount]}>
        <boxGeometry args={[0.018, 0.018, 0.13]} />
        <primitive object={materials.spark} attach="material" />
      </instancedMesh>
      <instancedMesh ref={emberMeshRef} args={[undefined, undefined, emberCount]}>
        <boxGeometry args={[0.045, 0.045, 0.045]} />
        <primitive object={materials.ember} attach="material" />
      </instancedMesh>

      <pointLight ref={lightRef} color="#f4a43b" intensity={0} distance={2.4} decay={2} />

      {debug ? (
        <>
          <primitive object={debugVelocityLine} />
          <primitive object={debugFlameLine} />
          <instancedMesh ref={debugTrailRef} args={[undefined, undefined, debugTrailPointCount]}>
            <sphereGeometry args={[1, 8, 8]} />
            <primitive object={materials.debugPoint} attach="material" />
          </instancedMesh>
          <instancedMesh ref={debugAnchorRef} args={[undefined, undefined, 2]}>
            <sphereGeometry args={[1, 10, 10]} />
            <primitive object={materials.debugAnchor} attach="material" />
          </instancedMesh>
        </>
      ) : null}
    </group>
  );
}
