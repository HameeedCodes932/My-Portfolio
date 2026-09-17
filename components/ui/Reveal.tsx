"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * Scroll-triggered reveal.
 *
 * `fade`  — rise + unblur on first intersection (default)
 * `clip`  — masked slide-up, good for headings (child is clipped, then lifts
 *           out of its overflow-hidden wrap)
 *
 * Pure CSS transition — composable, cheap, honours reduced-motion.
 */
export default function Reveal({
  children,
  className = "",
  delay = 0,
  variant = "fade",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: "fade" | "clip";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -4% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hidden = variant === "clip" ? "translate-y-[65%]" : "translate-y-5 opacity-0 blur-[2px]";
  const shown = variant === "clip" ? "translate-y-0" : "translate-y-0 opacity-100 blur-0";

  return (
    <div
      ref={ref}
      className={`${variant === "clip" ? "overflow-hidden" : ""} ${className}`}
    >
      <div
        style={{ transitionDelay: `${delay}ms` }}
        className={`transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-none ${
          visible ? shown : hidden
        }`}
      >
        {children}
      </div>
    </div>
  );
}