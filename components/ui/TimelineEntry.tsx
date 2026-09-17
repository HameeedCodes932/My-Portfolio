"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Editorial timeline row: hairline + node, then period on the left and
 * title/org/detail stacked on the right. The row's vertical segment draws
 * brass when it scrolls into view; the node reacts on hover.
 */
export default function TimelineEntry({
  period,
  title,
  org,
  detail,
  items,
}: {
  period: string;
  title: string;
  org: string;
  detail?: string;
  items?: string[];
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rowRef}
      className="group relative grid gap-6 border-l border-hairline pl-8 pb-12 sm:grid-cols-[10rem_1fr] sm:pl-10"
    >
      {/* Brass draw segment */}
      <span
        aria-hidden="true"
        className={`absolute bottom-0 left-0 top-3 w-px origin-top bg-brass/70 transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transform-none ${
          seen ? "scale-y-100" : "scale-y-0"
        }`}
      />

      <div className="relative">
        <span
          className={`absolute -left-[2.08rem] top-1 h-2.5 w-2.5 rounded-full border border-brass bg-noir transition-transform duration-300 motion-reduce:transition-none ${
            seen ? "scale-100" : "scale-75"
          }`}
        />
        <span className="caption-mono text-brass">{period}</span>
      </div>

      <div className="relative">
        <h3 className="font-display text-2xl italic text-ivory">
          {title}
        </h3>
        <p className="mt-1 text-sm text-bone">{org}</p>
        {detail ? (
          <p className="mt-3 max-w-md text-sm leading-relaxed text-fog italic">
            {detail}
          </p>
        ) : null}
        {items && items.length > 0 ? (
          <ul className="mt-3 max-w-md space-y-2">
            {items.map((item, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-bone">
                <span
                  aria-hidden="true"
                  className="mt-[0.55em] h-px w-4 shrink-0 bg-brass/50"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}