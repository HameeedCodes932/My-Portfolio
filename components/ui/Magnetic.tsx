"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import { useFinePointer, usePrefersReducedMotion } from "@/lib/motion";

/**
 * Magnet: the wrapped control drifts a few pixels toward the cursor within a
 * small radius, then eases back. Button/wrapper only — transform/transition
 * based, disabled for coarse pointers (touch) and reduced-motion.
 */
export default function Magnetic({
  children,
  mode = "inner",
}: {
  children: ReactNode;
  mode?: "inner" | "outer";
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const fine = useFinePointer();

  const onMove = (e: React.PointerEvent) => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || reduced || !fine) return;

    const r = outer.getBoundingClientRect();
    const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);

    const target = mode === "inner" ? inner : outer;
    const magnitude = mode === "inner" ? 5 : 10;
    target.style.transform = `translate3d(${(nx * magnitude).toFixed(
      1
    )}px, ${(ny * magnitude).toFixed(1)}px, 0)`;
  };

  const onLeave = () => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    outer.style.transform = "";
    inner.style.transform = "";
  };

  return (
    <div
      ref={outerRef}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="inline-block will-change-transform"
    >
      <div
        ref={innerRef}
        className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
      >
        {children}
      </div>
    </div>
  );
}