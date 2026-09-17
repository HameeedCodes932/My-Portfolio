"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import Robot from "./Robot";
import { useRobotDirector } from "./RobotDirector";

const DEBUG_CAMERA = process.env.NEXT_PUBLIC_DEBUG_CAMERA === "true";
const CAMERA_POSITION: [number, number, number] = [0, 1.25, 5.6];

function useCompactViewport() {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return compact;
}

function CameraRig() {
  const { camera } = useThree();

  useEffect(() => {
    camera.lookAt(0, -0.25, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  return null;
}

export default function Scene() {
  const {
    command,
    finishCommand,
    introActive,
    introPhase,
    markRobotReady,
    markRobotUnavailable,
    reducedMotion,
    signalRobotContact,
  } = useRobotDirector();
  const compact = useCompactViewport();

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      camera={{ position: CAMERA_POSITION, fov: 45 }}
      style={{ pointerEvents: "none" }}
    >
      <CameraRig />
      <ambientLight intensity={0.58} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={1.35}
      />
      <pointLight position={[-3, 2.6, 2.5]} intensity={0.7} color="#cca96a" />
      <Suspense fallback={null}>
        <Environment preset="city" />
        <Robot
          command={command}
          compact={compact}
          introActive={introActive}
          introPhase={introPhase}
          onCommandComplete={finishCommand}
          onCommandContact={signalRobotContact}
          onReady={markRobotReady}
          onUnavailable={markRobotUnavailable}
          reducedMotion={reducedMotion}
          scale={compact ? 0.24 : 0.56}
        />
      </Suspense>
      {DEBUG_CAMERA && <OrbitControls makeDefault target={[0, -0.45, 0]} />}
    </Canvas>
  );
}
