import type { ReactNode } from "react";

/**
 * Screen-still frame used wherever a real asset (screenshot, portrait,
 * heatmap) will eventually land. Corner ticks + ghost centre mark, so a
 * pending asset still reads as an intentional, populated composition.
 */
export default function StageFrame({
  label,
  ghost,
  children,
  className = "",
}: {
  label: string;
  ghost?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`stage-frame aspect-[4/5] w-full ${className}`}>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
        {ghost ? (
          <span className="font-display text-5xl italic leading-none text-ivory/[0.12] sm:text-6xl">
            {ghost}
          </span>
        ) : null}
        <span className="caption-mono text-bone/70">
          {children ?? `[${label} — placeholder]`}
        </span>
      </div>
    </div>
  );
}