"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import {
  resolveRobotTargetPoint,
  type RobotTargetRect,
} from "@/components/scene/RobotDirector";
import { createFractureShards } from "@/lib/fracture";
import { markTransitionTelemetry } from "@/lib/transitionTelemetry";

const DEBUG_DESTRUCTION =
  process.env.NEXT_PUBLIC_DEBUG_ROBOT_TARGET === "true";

interface DestructionTransitionProps {
  id: number;
  target: RobotTargetRect;
  onRouteCommit: () => void | Promise<void>;
  onComplete: () => void;
}

type SoundCue =
  | "contactImpact"
  | "energyCharge"
  | "throwWhoosh"
  | "explosionImpact"
  | "glassBreak"
  | "debris";

function once(callback: () => void) {
  let called = false;
  return () => {
    if (called) return;
    called = true;
    callback();
  };
}

function onceAsync(callback: () => void | Promise<void>) {
  let promise: Promise<void> | null = null;
  return () => {
    if (!promise) promise = Promise.resolve(callback());
    return promise;
  };
}

function soundCue(name: SoundCue) {
  window.dispatchEvent(new CustomEvent("robotSoundCue", { detail: { name } }));
}

function writeDebug(
  phase: string,
  data: {
    id: number;
    routeCommitted: boolean;
    target: [number, number];
    center: [number, number];
    projectile?: [number, number];
    shardCount: number;
    particleCount: number;
  }
) {
  if (!DEBUG_DESTRUCTION) return;
  (
    window as Window & {
      __robotDestructionDebug?: unknown;
    }
  ).__robotDestructionDebug = {
    phase,
    ...data,
  };
}

function buildSnapshotShards(
  container: HTMLDivElement,
  width: number,
  height: number,
  impactX: number,
  impactY: number
) {
  const mobile = width < 760;
  const shards = createFractureShards({
    width,
    height,
    impactX,
    impactY,
    mobile,
    seed: Math.round(impactX * 17 + impactY * 31 + width),
  });

  container.replaceChildren();
  const plate = document.createElement("div");
  plate.className = "destruction-surface-plate";
  container.appendChild(plate);

  shards.forEach((shard) => {
    const element = document.createElement("div");
    element.className = "destruction-shard destruction-shard-fallback";
    element.style.clipPath = shard.clipPath;
    element.style.transformOrigin = `${shard.centerX}px ${shard.centerY}px`;
    element.style.setProperty("--shard-cx", `${shard.centerX}px`);
    element.style.setProperty("--shard-cy", `${shard.centerY}px`);
    container.appendChild(element);
  });

  return {
    shards,
    plate,
    elements: Array.from(container.querySelectorAll(".destruction-shard")) as HTMLElement[],
  };
}

function addSpark(container: HTMLDivElement, index: number) {
  const spark = document.createElement("span");
  spark.className = "destruction-spark";
  const angle = index * 31 + (index % 4) * 13;
  const distance = 42 + (index % 6) * 15;
  spark.style.setProperty("--spark-angle", `${angle}deg`);
  spark.style.setProperty("--spark-distance", `${distance}px`);
  spark.dataset.angle = String(angle);
  spark.dataset.distance = String(distance);
  container.appendChild(spark);
}

function buildCracks(
  svg: SVGSVGElement,
  width: number,
  height: number,
  centerX: number,
  centerY: number
) {
  svg.replaceChildren();
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const lines = 13;
  const maxRadius = Math.hypot(width, height);

  for (let index = 0; index < lines; index += 1) {
    const angle =
      -Math.PI + (index / lines) * Math.PI * 2 + (index % 3 - 1) * 0.12;
    const endX = centerX + Math.cos(angle) * maxRadius;
    const endY = centerY + Math.sin(angle) * maxRadius;
    const midX = centerX + Math.cos(angle + 0.14) * maxRadius * 0.38;
    const midY = centerY + Math.sin(angle + 0.14) * maxRadius * 0.38;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      `M ${centerX} ${centerY} L ${midX} ${midY} L ${endX} ${endY}`
    );
    path.setAttribute("class", "destruction-crack-line");
    svg.appendChild(path);

    if (index % 2 === 0) {
      const branch = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const branchAngle = angle + (index % 4 < 2 ? 0.48 : -0.42);
      const startX = centerX + Math.cos(angle) * maxRadius * 0.3;
      const startY = centerY + Math.sin(angle) * maxRadius * 0.3;
      const branchEndX = startX + Math.cos(branchAngle) * maxRadius * 0.23;
      const branchEndY = startY + Math.sin(branchAngle) * maxRadius * 0.23;
      branch.setAttribute("d", `M ${startX} ${startY} L ${branchEndX} ${branchEndY}`);
      branch.setAttribute("class", "destruction-crack-line destruction-crack-branch");
      svg.appendChild(branch);
    }
  }

  Array.from(svg.querySelectorAll<SVGPathElement>("path")).forEach((path) => {
    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;
  });
}

export default function DestructionTransition({
  id,
  target,
  onRouteCommit,
  onComplete,
}: DestructionTransitionProps) {
  const routeCommitRef = useRef(onRouteCommit);
  const completeRef = useRef(onComplete);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const projectileRef = useRef<HTMLDivElement>(null);
  const impactRef = useRef<HTMLDivElement>(null);
  const shockwaveRef = useRef<HTMLDivElement>(null);
  const smokeRef = useRef<HTMLDivElement>(null);
  const cracksRef = useRef<SVGSVGElement>(null);
  const sparksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    routeCommitRef.current = onRouteCommit;
    completeRef.current = onComplete;
  }, [onComplete, onRouteCommit]);

  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    const fx = fxRef.current;
    const contact = contactRef.current;
    const core = coreRef.current;
    const projectile = projectileRef.current;
    const impact = impactRef.current;
    const shockwave = shockwaveRef.current;
    const smoke = smokeRef.current;
    const cracks = cracksRef.current;
    const sparks = sparksRef.current;

    if (
      !surface ||
      !fx ||
      !contact ||
      !core ||
      !projectile ||
      !impact ||
      !shockwave ||
      !smoke ||
      !cracks ||
      !sparks
    ) {
      routeCommitRef.current();
      completeRef.current();
      return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const mobile = width < 760;
    const resolvedTarget = resolveRobotTargetPoint(target);
    const targetPoint = { x: resolvedTarget.pointX, y: resolvedTarget.pointY };
    const centerPoint = { x: width / 2, y: height / 2 };
    const { shards, plate, elements } = buildSnapshotShards(
      surface,
      width,
      height,
      centerPoint.x,
      centerPoint.y
    );

    sparks.replaceChildren();
    const sparkCount = mobile ? 20 : 36;
    for (let index = 0; index < sparkCount; index += 1) addSpark(sparks, index);
    const sparkElements = Array.from(sparks.children) as HTMLElement[];
    buildCracks(cracks, width, height, centerPoint.x, centerPoint.y);

    fx.style.setProperty("--contact-x", `${targetPoint.x}px`);
    fx.style.setProperty("--contact-y", `${targetPoint.y}px`);
    fx.style.setProperty("--impact-x", `${centerPoint.x}px`);
    fx.style.setProperty("--impact-y", `${centerPoint.y}px`);

    const commitRoute = onceAsync(() => routeCommitRef.current());
    const complete = once(() => completeRef.current());
    let routeCommitted = false;
    let destinationReady = false;
    const write = (phase: string, projectilePoint?: [number, number]) =>
      writeDebug(phase, {
        id,
        routeCommitted,
        target: [targetPoint.x, targetPoint.y],
        center: [centerPoint.x, centerPoint.y],
        projectile: projectilePoint,
        shardCount: shards.length,
        particleCount: sparkCount,
      });

    const watchdog = window.setTimeout(() => {
      routeCommitted = true;
      void commitRoute().finally(() => {
        markTransitionTelemetry("outgoingSurfaceRemovedAt", {
          id,
          watchdog: true,
        });
        markTransitionTelemetry("transitionCompleteAt", {
          id,
          watchdog: true,
        });
        complete();
      });
    }, 6500);

    gsap.set(surface, { autoAlpha: 1 });
    gsap.set(plate, { autoAlpha: 1 });
    gsap.set(elements, {
      x: 0,
      y: 0,
      opacity: 1,
      rotate: 0,
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      filter: "brightness(1)",
      force3D: true,
    });
    gsap.set([contact, core, projectile, impact, shockwave, smoke, cracks], {
      autoAlpha: 0,
    });
    gsap.set(sparkElements, {
      autoAlpha: 0,
      scaleY: 0.2,
    });
    gsap.set(contact, { x: targetPoint.x, y: targetPoint.y, scale: 0.35 });
    gsap.set(core, { x: targetPoint.x, y: targetPoint.y, scale: 0.25 });
    gsap.set(projectile, {
      x: targetPoint.x,
      y: targetPoint.y,
      scale: mobile ? 0.7 : 0.88,
    });
    gsap.set(impact, { x: centerPoint.x, y: centerPoint.y, scale: 0.1 });
    gsap.set(shockwave, { x: centerPoint.x, y: centerPoint.y, scale: 0.08 });
    gsap.set(smoke, { x: centerPoint.x, y: centerPoint.y, scale: 0.65 });

    const flightDuration = mobile ? 0.42 : 0.58;
    const impactAt = 1.2 + flightDuration;
    const shatterAt = impactAt + 0.34;
    const windX = mobile ? -18 : -34;
    const windY = mobile ? 22 : 34;

    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      onComplete: () => {
        window.clearTimeout(watchdog);
        write("complete");
        complete();
      },
    });

    if (process.env.NODE_ENV !== "production" || DEBUG_DESTRUCTION) {
      (
        window as Window & {
          __robotDestructionTimeline?: gsap.core.Timeline;
        }
      ).__robotDestructionTimeline = tl;
    }

    tl.addLabel("CONTACT", 0)
      .call(() => {
        soundCue("contactImpact");
        write("contactImpact");
      }, undefined, "CONTACT")
      .to(contact, { autoAlpha: 1, scale: 1, duration: 0.08 }, "CONTACT")
      .to(contact, { autoAlpha: 0, scale: 3.3, duration: 0.24 }, "CONTACT+=0.08")
      .to(core, { autoAlpha: 1, scale: mobile ? 0.58 : 0.72, duration: 0.14 }, "CONTACT+=0.1")
      .to(
        core,
        {
          scale: mobile ? 1.02 : 1.22,
          duration: 0.44,
          ease: "elastic.out(1, 0.56)",
        },
        "CONTACT+=0.25"
      )
      .call(() => {
        soundCue("energyCharge");
        write("extracting");
      }, undefined, "CONTACT+=0.32")
      .to(
        core,
        {
          x: targetPoint.x + windX,
          y: targetPoint.y + windY,
          scale: mobile ? 1.18 : 1.38,
          duration: 0.36,
          ease: "power2.inOut",
        },
        "CONTACT+=0.62"
      )
      .addLabel("PROJECTILE_RELEASE", 1.2)
      .call(() => {
        soundCue("throwWhoosh");
        write("projectileFlight", [targetPoint.x, targetPoint.y]);
      }, undefined, "PROJECTILE_RELEASE")
      .set(
        projectile,
        {
          autoAlpha: 1,
          x: targetPoint.x + windX,
          y: targetPoint.y + windY,
        },
        "PROJECTILE_RELEASE"
      )
      .to(core, { autoAlpha: 0, scale: 0.72, duration: 0.08 }, "PROJECTILE_RELEASE")
      .to(
        projectile,
        {
          x: centerPoint.x,
          y: centerPoint.y,
          scale: mobile ? 1.16 : 1.36,
          duration: flightDuration,
          ease: "power3.in",
          onUpdate: () => {
            const x = Number(gsap.getProperty(projectile, "x"));
            const y = Number(gsap.getProperty(projectile, "y"));
            write("projectileFlight", [x, y]);
          },
        },
        "PROJECTILE_RELEASE"
      )
      .to(
        projectile,
        {
          scaleX: 0.72,
          scaleY: 1.42,
          filter: "brightness(2.3)",
          duration: 0.1,
          ease: "power2.in",
        },
        impactAt - 0.12
      )
      .addLabel("PROJECTILE_IMPACT", impactAt)
      .call(() => {
        soundCue("explosionImpact");
        markTransitionTelemetry("impactAt", { id });
        write("impact");
      }, undefined, "PROJECTILE_IMPACT")
      .set(impact, { autoAlpha: 1 }, "PROJECTILE_IMPACT")
      .to(projectile, { autoAlpha: 0, scale: 0.2, duration: 0.06 }, "PROJECTILE_IMPACT")
      .to(impact, { scale: mobile ? 9 : 15, autoAlpha: 0, duration: 0.36 }, "PROJECTILE_IMPACT")
      .to(
        sparkElements,
        {
          autoAlpha: 1,
          scaleY: 1,
          duration: 0.08,
          stagger: 0.004,
        },
        "PROJECTILE_IMPACT+=0.03"
      )
      .to(
        sparkElements,
        {
          x: (index, element) => {
            const angle = Number((element as HTMLElement).dataset.angle || 0);
            const distance = Number((element as HTMLElement).dataset.distance || 64);
            return Math.cos((angle * Math.PI) / 180) * distance;
          },
          y: (index, element) => {
            const angle = Number((element as HTMLElement).dataset.angle || 0);
            const distance = Number((element as HTMLElement).dataset.distance || 64);
            return Math.sin((angle * Math.PI) / 180) * distance;
          },
          autoAlpha: 0,
          duration: mobile ? 0.5 : 0.72,
          stagger: 0.006,
          ease: "power3.out",
        },
        "PROJECTILE_IMPACT+=0.08"
      )
      .to(shockwave, { autoAlpha: 1, scale: mobile ? 9 : 14, duration: 0.52 }, "PROJECTILE_IMPACT+=0.04")
      .to(shockwave, { autoAlpha: 0, duration: 0.22 }, "PROJECTILE_IMPACT+=0.34")
      .to(cracks, { autoAlpha: 1, duration: 0.04 }, "PROJECTILE_IMPACT+=0.06")
      .to(
        cracks.querySelectorAll(".destruction-crack-line"),
        {
          strokeDashoffset: 0,
          opacity: 1,
          duration: 0.38,
          stagger: 0.012,
          ease: "power3.out",
        },
        "PROJECTILE_IMPACT+=0.08"
      )
      .call(() => {
        routeCommitted = true;
        void commitRoute().then(() => {
          destinationReady = true;
          write("destinationReady");
          if (tl.paused()) tl.resume();
        });
        write("routeCommitted");
      }, undefined, "PROJECTILE_IMPACT+=0.12")
      .call(() => {
        if (destinationReady) return;
        write("waitingForDestination");
        tl.pause();
      }, undefined, shatterAt - 0.02)
      .call(() => {
        soundCue("glassBreak");
        write("shattering");
      }, undefined, shatterAt)
      .to(
        plate,
        {
          autoAlpha: 0,
          duration: 0.24,
          ease: "power2.out",
        },
        shatterAt
      )
      .to(smoke, { autoAlpha: 0.65, scale: mobile ? 1.8 : 2.5, duration: 0.5 }, shatterAt)
      .to(smoke, { autoAlpha: 0, duration: 0.7 }, shatterAt + 0.55);

    elements.forEach((element, index) => {
      const shard = shards[index];
      tl.to(
        element,
        {
          x: shard.flyX,
          y: shard.flyY,
          rotate: shard.rotate,
          rotateX: shard.rotateX,
          rotateY: shard.rotateY,
          scale: shard.scale,
          opacity: 0,
          filter: `blur(${shard.blur}px) brightness(1.18)`,
          duration: shard.duration,
          ease: "power4.in",
        },
        shatterAt + shard.delay
      );
    });

    tl.to(cracks, { autoAlpha: 0, duration: 0.44 }, shatterAt + 1.05)
      .to(surface, { autoAlpha: 0, duration: 0.3 }, shatterAt + 1.95)
      .call(() => {
        markTransitionTelemetry("outgoingSurfaceRemovedAt", { id });
      }, undefined, shatterAt + 2.25)
      .call(() => soundCue("debris"), undefined, shatterAt + 1.35)
      .to(fx, { autoAlpha: 0, duration: 0.42 }, shatterAt + 2.34)
      .call(() => {
        markTransitionTelemetry("transitionCompleteAt", { id });
      }, undefined, shatterAt + 2.76);

    return () => {
      window.clearTimeout(watchdog);
      tl.kill();
      if (process.env.NODE_ENV !== "production" || DEBUG_DESTRUCTION) {
        const debugWindow = window as Window & {
          __robotDestructionTimeline?: gsap.core.Timeline;
        };
        if (debugWindow.__robotDestructionTimeline === tl) {
          delete debugWindow.__robotDestructionTimeline;
        }
      }
      surface.replaceChildren();
    };
  }, [id, target]);

  return (
    <>
      <div
        ref={surfaceRef}
        className="destruction-surface-root"
        aria-hidden="true"
      />
      <div ref={fxRef} className="destruction-fx-root" aria-hidden="true">
        <div ref={contactRef} className="destruction-contact-burst">
          <span />
        </div>
        <div ref={coreRef} className="destruction-energy-core">
          <span className="destruction-energy-core-inner" />
          <span className="destruction-energy-core-shell" />
        </div>
        <div ref={projectileRef} className="destruction-projectile">
          <span className="destruction-projectile-trail" />
          <span className="destruction-projectile-core" />
        </div>
        <div ref={impactRef} className="destruction-impact-flash" />
        <div ref={shockwaveRef} className="destruction-shockwave" />
        <svg ref={cracksRef} className="destruction-cracks" />
        <div ref={sparksRef} className="destruction-sparks" />
        <div ref={smokeRef} className="destruction-smoke" />
      </div>
    </>
  );
}
