"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { useParallax, usePrefersReducedMotion, useTilt } from "@/lib/motion";

/**
 * Cinematic figure frame: a stage-frame that tilts toward the cursor,
 * drifts on scroll, and carries editorial HUD ticks ("FIG", cross-hair
 * centre). Used wherever a real still will eventually land.
 */
export default function FigureFrame({
  ghost,
  label,
  caption,
  className = "",
  imageClassName = "",
  tilt = true,
  src,
  alt = "",
  children,
}: {
  ghost?: string;
  label?: string;
  caption?: string;
  className?: string;
  imageClassName?: string;
  tilt?: boolean;
  src?: string;
  alt?: string;
  children: ReactNode;
}) {
  const parallaxRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useParallax(parallaxRef, reduced ? 0 : 0.05);
  useTilt(tiltRef, 5, tilt);

  return (
    <div ref={parallaxRef} className={className}>
      <div
        ref={tiltRef}
        className="stage-frame relative aspect-[4/5] w-full overflow-hidden motion-reduce:transform-none"
      >
        {/* HUD corner oscilloscope ticks */}
        <span
          aria-hidden="true"
          className="caption-mono absolute left-4 top-4 z-10 text-fog"
        >
          FIG.00
        </span>
        <span
          aria-hidden="true"
          className="caption-mono absolute right-4 top-4 z-10 text-fog/60"
        >
          {ghost ?? "·"}
        </span>
        <span
          aria-hidden="true"
          className="caption-mono absolute bottom-4 left-4 z-10 text-bone/60"
        >
          {label ?? "PORTRAIT"}
        </span>
        <span
          aria-hidden="true"
          className="absolute bottom-4 right-4 z-10 text-fog/70"
        >
          ✕
        </span>

        {/* Centre cross-hairs */}
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-brass/40"
        >
          +
        </span>

        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 640px) 80vw, 360px"
            priority
            className={`figure-frame-image object-cover ${imageClassName}`}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
            {ghost ? (
              <span className="font-display text-5xl italic leading-none text-ivory/[0.12] sm:text-6xl">
                {ghost}
              </span>
            ) : null}
            <span className="caption-mono text-bone/70">
              {children ?? null}
            </span>
          </div>
        )}

        <div className="scanline" aria-hidden="true" />
      </div>

      {caption ? (
        <p className="mt-3 text-center">
          <span className="caption-mono text-fog">{caption}</span>
        </p>
      ) : null}
    </div>
  );
}
