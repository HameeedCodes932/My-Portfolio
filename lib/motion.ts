"use client";

/**
 * Small motion primitives shared across Phase 3 interactions.
 *
 * Performance contract: every hook here animates via transform/opacity only,
 * writes straight to the DOM inside requestAnimationFrame (no React re-render
 * per frame), registers passive listeners, cleans up on unmount, and quietly
 * disables itself under `prefers-reduced-motion` or coarse pointers.
 */
import { useEffect, useRef } from "react";
import { useSyncExternalStore } from "react";

function subscribe(query: string) {
  return (onChange: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  };
}

const snapshot = (query: string) => () => window.matchMedia(query).matches;

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe("(prefers-reduced-motion: reduce)"),
    snapshot("(prefers-reduced-motion: reduce)"),
    () => false
  );
}

export function useFinePointer() {
  return useSyncExternalStore(
    subscribe("(pointer: fine)"),
    snapshot("(pointer: fine)"),
    () => false
  );
}

/**
 * Gentle pointer parallax. Elements inside `scopeRef` that carry a
 * `data-depth` attribute shift toward the cursor — depth in ~16px units.
 */
export function usePointerParallax(scopeRef: React.RefObject<HTMLElement | null>) {
  const reduced = usePrefersReducedMotion();
  const fine = useFinePointer();
  const targets = useRef<{ el: HTMLElement; depth: number }[]>([]);

  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;

    const collect = () => {
      targets.current = Array.from(
        scope.querySelectorAll<HTMLElement>("[data-depth]")
      ).map((el) => ({
        el,
        depth: Number(el.dataset.depth ?? 0) * 12,
      }));
    };
    collect();

    if (reduced || !fine) return;

    let raf = 0;
    let pending = { x: 0, y: 0 };
    let active = false;

    const apply = () => {
      active = false;
      const rect = scope.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const nx = (pending.x - rect.left) / rect.width - 0.5;
      const ny = (pending.y - rect.top) / rect.height - 0.5;
      for (const t of targets.current) {
        t.el.style.transform = `translate3d(${(nx * t.depth).toFixed(2)}px, ${(
          ny * t.depth
        ).toFixed(2)}px, 0)`;
      }
    };

    const onMove = (e: PointerEvent) => {
      pending = { x: e.clientX, y: e.clientY };
      if (!active) {
        active = true;
        raf = requestAnimationFrame(apply);
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
      for (const t of targets.current) t.el.style.transform = "";
    };
  }, [scopeRef, reduced, fine]);
}

/**
 * 3D hover tilt with perspective. Applies to `ref` itself. Subtle, so it
 * reads as "the object is physical", not a playful gimmick.
 */
export function useTilt(
  ref: React.RefObject<HTMLElement | null>,
  maxDeg = 5,
  enabled = true
) {
  const reduced = usePrefersReducedMotion();
  const fine = useFinePointer();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || !fine || !enabled) return;

    el.style.willChange = "transform";

    let raf = 0;
    let active = false;
    let px = 0;
    let py = 0;

    const apply = () => {
      active = false;
      el.style.transform = `perspective(900px) rotateX(${(-py * maxDeg).toFixed(
        2
      )}deg) rotateY(${(px * maxDeg).toFixed(2)}deg)`;
    };

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width - 0.5;
      py = (e.clientY - r.top) / r.height - 0.5;
      if (!active) {
        active = true;
        raf = requestAnimationFrame(apply);
      }
    };

    const onLeave = () => {
      cancelAnimationFrame(raf);
      active = false;
      el.style.transform = "perspective(900px)";
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
      el.style.willChange = "";
      el.style.transform = "";
    };
  }, [ref, maxDeg, enabled, reduced, fine]);
}

/**
 * Vertical progress fill: scales `ref` (a line/bar with transform-origin top)
 * from 0→1 as the element's frame travels through the viewport. Write-only.
 */
export function useScrollFill(
  lineRef: React.RefObject<HTMLElement | null>,
  enabled = true
) {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const line = lineRef.current;
    if (!line) return;

    if (!enabled) {
      line.style.transform = "scaleY(1)";
      return;
    }

    if (reduced) {
      line.style.transform = "scaleY(1)";
      return;
    }

    let raf = 0;
    let last = -1;

    const update = () => {
      const r = line.getBoundingClientRect();
      const vh =
        window.innerHeight || document.documentElement.clientHeight;
      if (r.height === 0) return;
      const total = r.height + vh;
      const p = Math.max(0, Math.min(1, (vh - r.top) / total));
      if (Math.abs(p - last) < 0.002) return;
      last = p;
      line.style.transform = `scaleY(${p.toFixed(4)})`;
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [lineRef, enabled, reduced]);
}

/**
 * Slow vertical parallax relative to viewport centre. `strength` < 1.
 */
export function useParallax(
  ref: React.RefObject<HTMLElement | null>,
  strength = 0.08,
  enabled = true
) {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || reduced) return;

    el.style.willChange = "transform";

    let raf = 0;

    const update = () => {
      const r = el.getBoundingClientRect();
      const vh =
        window.innerHeight || document.documentElement.clientHeight;
      if (r.height === 0) return;
      const offset = (r.top + r.height / 2 - vh / 2) * strength;
      el.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
      el.style.willChange = "";
      el.style.transform = "";
    };
  }, [ref, strength, enabled, reduced]);
}