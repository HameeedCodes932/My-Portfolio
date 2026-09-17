"use client";

/* eslint-disable react-hooks/immutability -- Three.js AnimationAction instances are mutable runtime controllers. */

import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { useFrame, useThree } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import RobotFlightFX, {
  createRobotFlightFxState,
  type RobotFlightPhase,
} from "./RobotFlightFX";
import {
  resolveRobotTargetPoint,
  type RobotCommand,
  type RobotIntroPhase,
  type RobotTargetRect,
} from "./RobotDirector";

const MODEL_URL = "/models/robot.glb";
const DEBUG_ROBOT_TARGET =
  process.env.NEXT_PUBLIC_DEBUG_ROBOT_TARGET === "true";
const CONTACT_TOLERANCE_PX = 8;
const INTERACTION_BONE_NAMES = [
  "mixamorig:RightHandIndex4",
  "mixamorig:RightHandIndex3",
  "mixamorig:RightHand",
];

type WelcomeRig = {
  leftArm: THREE.Object3D | null;
  rightArm: THREE.Object3D | null;
  leftForeArm: THREE.Object3D | null;
  rightForeArm: THREE.Object3D | null;
  leftHand: THREE.Object3D | null;
  rightHand: THREE.Object3D | null;
  spine: THREE.Object3D | null;
  head: THREE.Object3D | null;
};

if (typeof window !== "undefined") {
  useGLTF.preload(MODEL_URL);
}

export interface RobotProps {
  scale?: number | [number, number, number];
  command?: RobotCommand | null;
  compact?: boolean;
  introActive?: boolean;
  introPhase?: RobotIntroPhase;
  reducedMotion?: boolean;
  onReady?: () => void;
  onUnavailable?: () => void;
  onCommandContact?: (id: number) => void;
  onCommandComplete?: (id: number) => void;
}

const desktopRest = new THREE.Vector3(0.34, -1.18, 0);
const compactRest = new THREE.Vector3(0.98, -2.02, 0);
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();
const tmpD = new THREE.Vector3();

function toScaleVector(scale: RobotProps["scale"]) {
  if (Array.isArray(scale)) return scale;
  const value = scale ?? 0.56;
  return [value, value, value] as [number, number, number];
}

function pointOnQuadratic(
  start: THREE.Vector3,
  control: THREE.Vector3,
  end: THREE.Vector3,
  t: number,
  target: THREE.Vector3
) {
  const inv = 1 - t;
  target
    .copy(start)
    .multiplyScalar(inv * inv)
    .add(tmpA.copy(control).multiplyScalar(2 * inv * t))
    .add(tmpB.copy(end).multiplyScalar(t * t));
}

function faceTravel(robot: THREE.Group, from: THREE.Vector3, to: THREE.Vector3) {
  const dx = to.x - from.x;
  robot.rotation.y = THREE.MathUtils.clamp(-dx * 0.42, -0.72, 0.72);
}

function faceFlightPath(
  robot: THREE.Group,
  from: THREE.Vector3,
  to: THREE.Vector3,
  progress: number,
  compact: boolean
) {
  tmpD.subVectors(to, from);
  if (tmpD.lengthSq() < 0.000001) return;

  const direction = tmpD.normalize();
  const travelStrength =
    THREE.MathUtils.smoothstep(progress, 0.06, 0.26) *
    (1 - THREE.MathUtils.smoothstep(progress, 0.72, 0.94));
  const screenPlaneSpeed = Math.hypot(direction.x, direction.y);
  const rollToTrajectory =
    screenPlaneSpeed > 0.001
      ? -Math.atan2(direction.x, Math.max(0.12, Math.abs(direction.y)))
      : 0;
  const yaw = THREE.MathUtils.clamp(-direction.x * 0.92, -0.82, 0.82);
  const pitch =
    -travelStrength * (compact ? 0.72 : 0.98) +
    THREE.MathUtils.clamp(-direction.y * 0.16, -0.16, 0.16);
  const bank = THREE.MathUtils.clamp(
    rollToTrajectory * 0.92 + direction.y * 0.08,
    compact ? -0.9 : -1.18,
    compact ? 0.9 : 1.18
  );

  robot.rotation.x = THREE.MathUtils.lerp(robot.rotation.x, pitch, 0.34);
  robot.rotation.y = THREE.MathUtils.lerp(robot.rotation.y, yaw, 0.28);
  robot.rotation.z = THREE.MathUtils.lerp(
    robot.rotation.z,
    bank * travelStrength,
    0.32
  );
}

function findInteractionAnchor(scene: THREE.Object3D) {
  for (const name of INTERACTION_BONE_NAMES) {
    const object = scene.getObjectByName(name);
    if (object) return object;
  }

  const skeletonBones: THREE.Bone[] = [];
  scene.traverse((object) => {
    const maybeSkinned = object as THREE.SkinnedMesh;
    if (maybeSkinned.isSkinnedMesh) {
      skeletonBones.push(...maybeSkinned.skeleton.bones);
    }
  });

  for (const name of INTERACTION_BONE_NAMES) {
    const bone = skeletonBones.find((candidate) => candidate.name === name);
    if (bone) return bone;
  }

  return (
    skeletonBones.find((bone) => /RightHandIndex4$/i.test(bone.name)) ??
    skeletonBones.find((bone) => /RightHandIndex3$/i.test(bone.name)) ??
    skeletonBones.find((bone) => /RightHand$/i.test(bone.name)) ??
    scene
  );
}

function findRigPart(scene: THREE.Object3D, patterns: RegExp[]) {
  let match: THREE.Object3D | null = null;
  scene.traverse((object) => {
    if (match) return;
    if (patterns.some((pattern) => pattern.test(object.name))) match = object;
  });
  return match;
}

function RobotInner({
  scale,
  command,
  compact = false,
  introActive = false,
  introPhase = "complete",
  reducedMotion = false,
  onReady,
  onUnavailable,
  onCommandContact,
  onCommandComplete,
}: RobotProps) {
  const group = useRef<THREE.Group>(null);
  const activeAction = useRef<THREE.AnimationAction | null>(null);
  const handledCommand = useRef<number | null>(null);
  const contactedCommand = useRef<number | null>(null);
  const pinnedContact = useRef<{ id: number; target: RobotTargetRect } | null>(null);
  const contactRetry = useRef<number | null>(null);
  const flightFxState = useRef(createRobotFlightFxState());
  const raycaster = useRef(new THREE.Raycaster());
  const targetMarkerRef = useRef<THREE.Mesh>(null);
  const fingerMarkerRef = useRef<THREE.Mesh>(null);
  const welcomeGestureAmount = useRef(0);
  const rigRestRotations = useRef(new Map<string, THREE.Euler>());

  const { camera, gl } = useThree();
  const { scene, animations } = useGLTF(MODEL_URL);
  const { actions } = useAnimations(animations, group);
  const scaleVector = useMemo(() => toScaleVector(scale), [scale]);
  const restPosition = useMemo(
    () => (compact ? compactRest.clone() : desktopRest.clone()),
    [compact]
  );
  const introStartPosition = useMemo(() => {
    const position = restPosition.clone();
    position.x = compact ? 0.36 : 0.06;
    position.y -= compact ? 0.12 : 0.04;
    position.z = compact ? -5.2 : -6.4;
    return position;
  }, [compact, restPosition]);
  const interactionAnchor = useMemo(
    () => findInteractionAnchor(scene),
    [scene]
  );
  const welcomeRig = useMemo<WelcomeRig>(
    () => ({
      leftArm: findRigPart(scene, [/LeftArm$/i, /LeftShoulder/i]),
      rightArm: findRigPart(scene, [/RightArm$/i, /RightShoulder/i]),
      leftForeArm: findRigPart(scene, [/LeftForeArm$/i, /LeftForearm$/i]),
      rightForeArm: findRigPart(scene, [/RightForeArm$/i, /RightForearm$/i]),
      leftHand: findRigPart(scene, [/LeftHand$/i]),
      rightHand: findRigPart(scene, [/RightHand$/i]),
      spine: findRigPart(scene, [/Spine2$/i, /Spine1$/i, /Spine$/i]),
      head: findRigPart(scene, [/Head$/i]),
    }),
    [scene]
  );

  const setFlightFx = useCallback(
    (
      phase: RobotFlightPhase,
      intensity = flightFxState.current.intensity,
      options: { launch?: boolean; landing?: boolean; precision?: boolean } = {}
    ) => {
      const state = flightFxState.current;
      state.phase = reducedMotion ? "idle" : phase;
      state.intensity = reducedMotion ? 0 : intensity;
      state.precisionActive = Boolean(options.precision);
      if (options.launch) state.launchPulse = 1;
      if (options.landing) state.landingPulse = 1;
    },
    [reducedMotion]
  );

  useEffect(() => {
    Object.values(welcomeRig).forEach((part) => {
      if (!part || rigRestRotations.current.has(part.uuid)) return;
      rigRestRotations.current.set(part.uuid, part.rotation.clone());
    });
  }, [welcomeRig]);

  const applyWelcomeGesture = useCallback(() => {
    const active =
      introPhase === "welcomeGesture" ||
      introPhase === "speaking" ||
      introPhase === "energyBuild" ||
      introPhase === "portalOpening";
    const targetAmount = active ? 1 : 0;
    welcomeGestureAmount.current = THREE.MathUtils.lerp(
      welcomeGestureAmount.current,
      targetAmount,
      active ? 0.08 : 0.12
    );

    const amount = welcomeGestureAmount.current;
    if (amount < 0.002 && !active) return;

    const pose = (
      part: THREE.Object3D | null,
      rotation: Partial<{ x: number; y: number; z: number }>
    ) => {
      if (!part) return;
      const rest = rigRestRotations.current.get(part.uuid);
      if (!rest) return;
      part.rotation.x = THREE.MathUtils.lerp(
        part.rotation.x,
        rest.x + (rotation.x ?? 0) * amount,
        0.18
      );
      part.rotation.y = THREE.MathUtils.lerp(
        part.rotation.y,
        rest.y + (rotation.y ?? 0) * amount,
        0.18
      );
      part.rotation.z = THREE.MathUtils.lerp(
        part.rotation.z,
        rest.z + (rotation.z ?? 0) * amount,
        0.18
      );
    };

    pose(welcomeRig.leftArm, { x: -0.16, z: 0.46 });
    pose(welcomeRig.rightArm, { x: -0.16, z: -0.46 });
    pose(welcomeRig.leftForeArm, { x: -0.08, z: 0.22 });
    pose(welcomeRig.rightForeArm, { x: -0.08, z: -0.22 });
    pose(welcomeRig.leftHand, { y: -0.16, z: 0.18 });
    pose(welcomeRig.rightHand, { y: 0.16, z: -0.18 });
    pose(welcomeRig.spine, { y: -0.04 });
    pose(welcomeRig.head, { x: -0.05, y: 0.04 });
  }, [introPhase, welcomeRig]);

  const clipDuration = useCallback(
    (name: string) => animations.find((clip) => clip.name === name)?.duration ?? 1,
    [animations]
  );

  const playClip = useCallback(
    (
      name: string,
      options: { once?: boolean; fade?: number; timeScale?: number } = {}
    ) => {
      const action = actions[name] ?? actions.BreathingIdle ?? actions.Idle;
      if (!action) return clipDuration(name);

      const previous = activeAction.current;
      if (previous && previous !== action) previous.fadeOut(options.fade ?? 0.18);

      action.reset();
      action.enabled = true;
      action.clampWhenFinished = Boolean(options.once);
      action.timeScale = options.timeScale ?? 1;
      action.setLoop(
        options.once ? THREE.LoopOnce : THREE.LoopRepeat,
        options.once ? 1 : Number.POSITIVE_INFINITY
      );
      action.fadeIn(options.fade ?? 0.18).play();
      activeAction.current = action;
      return action.getClip().duration / Math.abs(action.timeScale || 1);
    },
    [actions, clipDuration]
  );

  const screenPointToWorld = useCallback(
    (screenX: number, screenY: number) => {
      const canvasRect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((screenX - canvasRect.left) / canvasRect.width) * 2 - 1,
        -(((screenY - canvasRect.top) / canvasRect.height) * 2 - 1)
      );

      raycaster.current.setFromCamera(ndc, camera);

      const cameraNormal = new THREE.Vector3();
      camera.getWorldDirection(cameraNormal).normalize();
      const interactionPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        cameraNormal,
        tmpC.copy(restPosition)
      );
      const hit = new THREE.Vector3();
      return raycaster.current.ray.intersectPlane(interactionPlane, hit)
        ? hit
        : restPosition.clone();
    },
    [camera, gl.domElement, restPosition]
  );

  const projectWorldToScreen = useCallback(
    (world: THREE.Vector3) => {
      const canvasRect = gl.domElement.getBoundingClientRect();
      const projected = world.clone().project(camera);
      return {
        x: ((projected.x + 1) * canvasRect.width) / 2 + canvasRect.left,
        y: ((-projected.y + 1) * canvasRect.height) / 2 + canvasRect.top,
      };
    },
    [camera, gl.domElement]
  );

  const resolveTargetWorld = useCallback(
    (target: RobotTargetRect) => {
      const snapshot = resolveRobotTargetPoint(target);
      return {
        snapshot,
        targetWorld: screenPointToWorld(snapshot.pointX, snapshot.pointY),
      };
    },
    [screenPointToWorld]
  );

  const readFingerWorld = useCallback(() => {
    const robot = group.current;
    const fingerWorld = new THREE.Vector3();
    if (!robot) return fingerWorld;
    robot.updateWorldMatrix(true, true);
    scene.updateWorldMatrix(true, true);
    interactionAnchor.getWorldPosition(fingerWorld);
    return fingerWorld;
  }, [interactionAnchor, scene]);

  const updateDebug = useCallback(
    ({
      target,
      targetWorld,
      fingerWorld,
      phase,
    }: {
      target: RobotTargetRect;
      targetWorld: THREE.Vector3;
      fingerWorld: THREE.Vector3;
      phase: string;
    }) => {
      const snapshot = resolveRobotTargetPoint(target);
      const fingerScreen = projectWorldToScreen(fingerWorld);
      const targetScreen = { x: snapshot.pointX, y: snapshot.pointY };
      const distancePx = Math.hypot(
        fingerScreen.x - targetScreen.x,
        fingerScreen.y - targetScreen.y
      );

      if (DEBUG_ROBOT_TARGET) {
        if (targetMarkerRef.current) {
          targetMarkerRef.current.visible = true;
          targetMarkerRef.current.position.copy(targetWorld);
        }
        if (fingerMarkerRef.current) {
          fingerMarkerRef.current.visible = true;
          fingerMarkerRef.current.position.copy(fingerWorld);
        }
      }

      if (typeof window !== "undefined") {
        (
          window as Window & {
            __robotInteractionDebug?: {
              anchorName: string;
              phase: string;
              tolerancePx: number;
              distancePx: number;
              target: [number, number];
              finger: [number, number];
              targetWorld: [number, number, number];
              fingerWorld: [number, number, number];
            };
          }
        ).__robotInteractionDebug = {
          anchorName: interactionAnchor.name || "scene",
          phase,
          tolerancePx: CONTACT_TOLERANCE_PX,
          distancePx,
          target: [targetScreen.x, targetScreen.y],
          finger: [fingerScreen.x, fingerScreen.y],
          targetWorld: [targetWorld.x, targetWorld.y, targetWorld.z],
          fingerWorld: [fingerWorld.x, fingerWorld.y, fingerWorld.z],
        };
      }

      return { distancePx, fingerScreen, targetScreen };
    },
    [interactionAnchor.name, projectWorldToScreen]
  );

  const measureContact = useCallback(
    (target: RobotTargetRect, phase: string) => {
      const { targetWorld } = resolveTargetWorld(target);
      const fingerWorld = readFingerWorld();
      const debug = updateDebug({ target, targetWorld, fingerWorld, phase });
      return { targetWorld, fingerWorld, ...debug };
    },
    [readFingerWorld, resolveTargetWorld, updateDebug]
  );

  const rootForFingerTarget = useCallback(
    (target: RobotTargetRect, phase: string) => {
      const robot = group.current;
      const { targetWorld } = resolveTargetWorld(target);
      if (!robot) return { rootWorld: restPosition.clone(), targetWorld };

      robot.updateWorldMatrix(true, true);
      scene.updateWorldMatrix(true, true);

      const rootWorld = new THREE.Vector3();
      const fingerWorld = new THREE.Vector3();
      robot.getWorldPosition(rootWorld);
      interactionAnchor.getWorldPosition(fingerWorld);

      const handOffsetFromRoot = fingerWorld.sub(rootWorld);
      const requiredRoot = targetWorld.clone().sub(handOffsetFromRoot);
      updateDebug({
        target,
        targetWorld,
        fingerWorld: readFingerWorld(),
        phase,
      });

      return { rootWorld: requiredRoot, targetWorld };
    },
    [
      interactionAnchor,
      readFingerWorld,
      resolveTargetWorld,
      restPosition,
      scene,
      updateDebug,
    ]
  );

  const alignFingerToTarget = useCallback(
    (target: RobotTargetRect, phase: string) => {
      const robot = group.current;
      if (!robot) return { distancePx: Number.POSITIVE_INFINITY };

      const { targetWorld } = resolveTargetWorld(target);
      const fingerWorld = readFingerWorld();
      const correction = targetWorld.clone().sub(fingerWorld);
      robot.position.add(correction);
      robot.updateWorldMatrix(true, true);

      return measureContact(target, phase);
    },
    [measureContact, readFingerWorld, resolveTargetWorld]
  );

  const signalMeasuredContact = useCallback(
    (id: number, target: RobotTargetRect) => {
      const first = alignFingerToTarget(target, "contact");
      const final =
        first.distancePx <= CONTACT_TOLERANCE_PX
          ? first
          : alignFingerToTarget(target, "contact-retry");

      if (
        final.distancePx <= CONTACT_TOLERANCE_PX &&
        contactedCommand.current !== id
      ) {
        if (typeof window !== "undefined") {
          (
            window as Window & {
              __robotLastContactDebug?: {
                id: number;
                distancePx: number;
                tolerancePx: number;
                phase: string;
              };
            }
          ).__robotLastContactDebug = {
            id,
            distancePx: final.distancePx,
            tolerancePx: CONTACT_TOLERANCE_PX,
            phase: "contact",
          };
        }
        contactedCommand.current = id;
        onCommandContact?.(id);
        return;
      }

      contactRetry.current = window.setTimeout(() => {
        const retry = alignFingerToTarget(target, "contact-late-retry");
        if (
          retry.distancePx <= CONTACT_TOLERANCE_PX &&
          contactedCommand.current !== id
        ) {
          if (typeof window !== "undefined") {
            (
              window as Window & {
                __robotLastContactDebug?: {
                  id: number;
                  distancePx: number;
                  tolerancePx: number;
                  phase: string;
                };
              }
            ).__robotLastContactDebug = {
              id,
              distancePx: retry.distancePx,
              tolerancePx: CONTACT_TOLERANCE_PX,
              phase: "contact-late-retry",
            };
          }
          contactedCommand.current = id;
          onCommandContact?.(id);
        }
      }, 50);
    },
    [alignFingerToTarget, onCommandContact]
  );

  useEffect(() => {
    try {
      scene.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) {
          const material = (object as THREE.Mesh).material;
          if (Array.isArray(material)) {
            material.forEach((m) => {
              m.depthTest = true;
              m.depthWrite = true;
            });
          } else if (material) {
            material.depthTest = true;
            material.depthWrite = true;
          }
        }
      });
      onReady?.();
    } catch {
      onUnavailable?.();
    }
  }, [onReady, onUnavailable, scene]);

  useEffect(() => {
    const robot = group.current;
    if (!robot || command) return;

    robot.position.copy(introActive ? introStartPosition : restPosition);
    robot.rotation.set(0, compact ? -0.24 : -0.08, 0);
    setFlightFx("idle", 0);
    playClip("BreathingIdle", { fade: 0.2 });
  }, [
    command,
    compact,
    introActive,
    introStartPosition,
    playClip,
    restPosition,
    setFlightFx,
  ]);

  useFrame(() => {
    applyWelcomeGesture();
    if (!command || reducedMotion) return;
    if (pinnedContact.current?.id === command.id) {
      alignFingerToTarget(pinnedContact.current.target, "pinned-contact");
      return;
    }
    measureContact(command.target, "tracking");
  });

  useEffect(() => {
    const robot = group.current;
    if (!robot || !command || handledCommand.current === command.id) return;
    handledCommand.current = command.id;
    contactedCommand.current = null;
    pinnedContact.current = null;

    if (reducedMotion) {
      onCommandComplete?.(command.id);
      return;
    }

    const useRobotFlightFx =
      command.target.kind === "menu" ||
      command.target.kind === "navigation" ||
      command.target.kind === "internal-action" ||
      command.target.kind === "intro";
    setFlightFx("charge", 0.12);

    const initialTarget = rootForFingerTarget(command.target, "approach");
    const targetRootWorld = initialTarget.rootWorld.clone();
    const start = robot.position.clone();
    const outboundControl = start.clone().lerp(targetRootWorld, 0.5);
    outboundControl.y =
      Math.max(start.y, targetRootWorld.y) + (compact ? 0.3 : 0.4);
    outboundControl.x += (targetRootWorld.x - start.x) * 0.16;
    outboundControl.z -= 0.08;

    const precisionStart = new THREE.Vector3();
    const precisionEnd = new THREE.Vector3();
    const precision = { t: 0 };
    const returnStart = targetRootWorld.clone();
    const inboundControl = new THREE.Vector3();

    const outbound = { t: 0 };
    const inbound = { t: 0 };
    const targetPoint = resolveRobotTargetPoint(command.target);
    const targetYaw = THREE.MathUtils.clamp(
      targetPoint.pointX > targetPoint.viewportWidth / 2 ? -0.52 : 0.52,
      -0.72,
      0.72
    );

    const tl = gsap.timeline({
      onComplete: () => {
        robot.position.copy(restPosition);
        robot.rotation.set(0, compact ? -0.24 : -0.08, 0);
        setFlightFx("idle", 0);
        playClip("BreathingIdle", { fade: 0.18 });
        onCommandComplete?.(command.id);
      },
    });

    tl.call(() => {
      if (useRobotFlightFx) setFlightFx("charge", 0.18);
      playClip("ActionIdleToStandingIdle", {
        once: true,
        fade: 0.12,
        timeScale: 1.45,
      });
    })
      .to(
        flightFxState.current,
        { intensity: useRobotFlightFx ? 0.38 : 0, duration: 0.26, ease: "power2.out" },
        0.02
      )
      .to(robot.rotation, { y: targetYaw * 0.55, duration: 0.28, ease: "power2.out" }, 0)
      .to(
        robot.position,
        { y: start.y - 0.08, duration: 0.24, yoyo: true, repeat: 1, ease: "power2.inOut" },
        0
      )
      .call(() => {
        if (useRobotFlightFx) setFlightFx("launch", 0.95, { launch: true });
        playClip("RunningJump", { once: true, fade: 0.08, timeScale: 0.92 });
      }, undefined, 0.36)
      .to(
        flightFxState.current,
        { intensity: useRobotFlightFx ? 1.12 : 0, duration: 0.2, ease: "power2.out" },
        0.36
      )
      .call(() => {
        if (useRobotFlightFx) setFlightFx("flight", flightFxState.current.intensity);
      }, undefined, 0.56)
      .to(
        outbound,
        {
          t: 1,
          duration: 1.06,
          ease: "power2.inOut",
          onUpdate: () => {
            const previous = robot.position.clone();
            pointOnQuadratic(
              start,
              outboundControl,
              targetRootWorld,
              outbound.t,
              robot.position
            );
            if (useRobotFlightFx) {
              faceFlightPath(robot, previous, robot.position, outbound.t, compact);
            } else {
              faceTravel(robot, previous, robot.position);
            }
          },
        },
        0.36
      )
      .to(
        flightFxState.current,
        { intensity: useRobotFlightFx ? 0.22 : 0, duration: 0.34, ease: "power3.out" },
        1.06
      )
      .call(() => {
        if (useRobotFlightFx) setFlightFx("approach", flightFxState.current.intensity);
      }, undefined, 1.08)
      .to(
        robot.rotation,
        { x: 0, y: targetYaw, z: 0, duration: 0.32, ease: "power2.out" },
        1.16
      )
      .call(() => {
        playClip("FallingToLanding", { once: true, fade: 0.1, timeScale: 1.08 });
      }, undefined, 1.26)
      .call(() => {
        if (useRobotFlightFx) setFlightFx("precision", 0, { precision: true });
        playClip("ButtonPushing", { once: true, fade: 0.12, timeScale: 0.96 });
      }, undefined, 1.68)
      .call(() => {
        const solved = rootForFingerTarget(command.target, "align-start");
        precisionStart.copy(robot.position);
        precisionEnd.copy(solved.rootWorld);
        precision.t = 0;
      }, undefined, 1.86)
      .to(
        precision,
        {
          t: 1,
          duration: 0.28,
          ease: "power3.out",
          onUpdate: () => {
            robot.position.lerpVectors(precisionStart, precisionEnd, precision.t);
            measureContact(command.target, "aligning");
          },
        },
        1.86
      )
      .call(() => {
        if (useRobotFlightFx) setFlightFx("precision", 0, { precision: true });
        pinnedContact.current = { id: command.id, target: command.target };
        signalMeasuredContact(command.id, command.target);
      }, undefined, 2.18)
      .call(() => {
        playClip("Punching", { once: true, fade: 0.12, timeScale: 0.95 });
      }, undefined, 2.66)
      .to(robot.rotation, { y: 0, duration: 0.38, ease: "power2.inOut" }, 2.72)
      .call(() => {
        pinnedContact.current = null;
        if (useRobotFlightFx) setFlightFx("idle", 0);
      }, undefined, 2.82)
      .call(() => {
        if (useRobotFlightFx) setFlightFx("charge", 0.16);
        returnStart.copy(robot.position);
        inboundControl.copy(returnStart).lerp(restPosition, 0.5);
        inboundControl.y =
          Math.max(returnStart.y, restPosition.y) + (compact ? 0.3 : 0.4);
        inboundControl.x += (restPosition.x - returnStart.x) * 0.14;
        inboundControl.z -= 0.06;
      }, undefined, 5.28)
      .call(() => {
        if (useRobotFlightFx) setFlightFx("return", 0.95, { launch: true });
        playClip("RunningJump", { once: true, fade: 0.12, timeScale: 1.05 });
      }, undefined, 5.36)
      .to(
        flightFxState.current,
        { intensity: useRobotFlightFx ? 0.98 : 0, duration: 0.16, ease: "power2.out" },
        5.36
      )
      .to(
        inbound,
        {
          t: 1,
          duration: 0.98,
          ease: "power2.inOut",
          onUpdate: () => {
            const previous = robot.position.clone();
            pointOnQuadratic(
              returnStart,
              inboundControl,
              restPosition,
              inbound.t,
              robot.position
            );
            if (useRobotFlightFx) {
              faceFlightPath(robot, previous, robot.position, inbound.t, compact);
            } else {
              faceTravel(robot, previous, robot.position);
            }
          },
        },
        5.36
      )
      .to(
        flightFxState.current,
        { intensity: useRobotFlightFx ? 0.18 : 0, duration: 0.28, ease: "power2.out" },
        5.96
      )
      .call(() => {
        if (useRobotFlightFx) setFlightFx("landing", 0.12, { landing: true });
        playClip("FallingToLanding", { once: true, fade: 0.1, timeScale: 1.15 });
      }, undefined, 6.16)
      .to(
        robot.rotation,
        { x: 0, y: compact ? -0.24 : -0.08, z: 0, duration: 0.28, ease: "power2.out" },
        6.22
      )
      .to(
        flightFxState.current,
        { intensity: 0, duration: 0.22, ease: "power2.out" },
        6.26
      );

    return () => {
      tl.kill();
      pinnedContact.current = null;
      setFlightFx("idle", 0);
      if (contactRetry.current !== null) {
        window.clearTimeout(contactRetry.current);
        contactRetry.current = null;
      }
    };
  }, [
    command,
    compact,
    introActive,
    measureContact,
    onCommandComplete,
    playClip,
    reducedMotion,
    restPosition,
    rootForFingerTarget,
    setFlightFx,
    signalMeasuredContact,
  ]);

  return (
    <>
      <group ref={group} scale={scaleVector}>
        <primitive object={scene} />
      </group>
      <RobotFlightFX
        robotRef={group}
        scene={scene}
        stateRef={flightFxState}
        compact={compact}
        reducedMotion={reducedMotion}
        debug={DEBUG_ROBOT_TARGET}
      />
      {DEBUG_ROBOT_TARGET ? (
        <>
          <mesh ref={targetMarkerRef} visible={false}>
            <sphereGeometry args={[0.045, 16, 16]} />
            <meshBasicMaterial color="#ff3030" depthTest={false} />
          </mesh>
          <mesh ref={fingerMarkerRef} visible={false}>
            <sphereGeometry args={[0.036, 16, 16]} />
            <meshBasicMaterial color="#31ff5a" depthTest={false} />
          </mesh>
        </>
      ) : null}
    </>
  );
}

function PlaceholderRobot() {
  return (
    <mesh position={[0, -1, 0]}>
      <icosahedronGeometry args={[0.5, 1]} />
      <meshStandardMaterial color="#333" wireframe roughness={0.8} metalness={0.2} />
    </mesh>
  );
}

class ModelErrorBoundary extends Component<
  { children: ReactNode; onUnavailable?: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[Robot] could not load robot model:", error.message);
    this.props.onUnavailable?.();
  }

  render() {
    if (this.state.hasError) {
      return <PlaceholderRobot />;
    }
    return this.props.children;
  }
}

export default function Robot(props: RobotProps) {
  return (
    <ModelErrorBoundary onUnavailable={props.onUnavailable}>
      <Suspense fallback={<PlaceholderRobot />}>
        <RobotInner {...props} />
      </Suspense>
    </ModelErrorBoundary>
  );
}
