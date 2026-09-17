"use client";

import { useRef } from "react";
import { useScrollFill, usePrefersReducedMotion } from "@/lib/motion";
import PlaceholderText from "@/components/ui/PlaceholderText";

export interface TimelineNode {
  num: string;
  phase: string;
  title?: string;
  body?: string;
}

/**
 * A scroll-drawn narrative rail: a brass spine fills as you scroll, milestone
 * nodes sit on it, and the final node reads as "now". Content is always
 * readable; the fill only guides attention.
 */
export default function VrtTimeline({
  items,
  currentLabel = "CURRENT",
}: {
  items: TimelineNode[];
  currentLabel?: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  useScrollFill(railRef, !reduced);

  const last = items.length - 1;

  return (
    <ol className="relative pl-8 sm:pl-12">
      {/* Spine track + brass fill */}
      <div
        aria-hidden="true"
        className="absolute left-0 top-0 h-full w-px bg-hairline sm:left-2"
      />
      <div
        ref={railRef}
        aria-hidden="true"
        className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-brass/20 to-brass sm:left-2"
        style={{ transform: "scaleY(0)", transformOrigin: "top" }}
      />

      {items.map((item, i) => {
        const isNow = i === last;
        return (
          <li key={item.num} className="relative pb-12 sm:pb-16">
            {/* Node */}
            <span
              aria-hidden="true"
              className={`absolute -left-[7px] top-1 h-3.5 w-3.5 rounded-full border border-brass sm:-left-[5px] ${
                isNow ? "node-now bg-brass/40" : "bg-noir"
              }`}
            />

            <div className="grid gap-3 sm:grid-cols-[6.5rem_1fr]">
              <p
                className={`caption-mono ${
                  isNow ? "text-brass" : "text-fog"
                }`}
              >
                {isNow ? (
                  <>
                    {currentLabel} —{" "}
                    <span className="caret" />
                  </>
                ) : (
                  <>
                    {item.num} / {item.phase}
                  </>
                )}
              </p>
              <div>
                {item.title ? (
                  <h3 className="font-display text-3xl italic leading-snug text-ivory">
                    <PlaceholderText value={item.title} />
                  </h3>
                ) : null}
                {item.body ? (
                  <p className="mt-3 max-w-2xl leading-relaxed text-bone italic">
                    <PlaceholderText value={item.body} />
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}