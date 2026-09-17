"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import type { Section } from "@/lib/sections";
import Reveal from "@/components/ui/Reveal";
import { useParallax, usePrefersReducedMotion } from "@/lib/motion";

/**
 * Standard page shell for a section: ghost numeral backdrop (parallaxes on
 * scroll), masked heading reveal, numbered rule, then the section's own
 * asymmetric content.
 */
export default function SectionShell({
  section,
  title,
  lead,
  note,
  children,
}: {
  section: Section;
  title: string;
  lead?: string;
  note?: string;
  children?: ReactNode;
}) {
  const numeralRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  useParallax(numeralRef, reduced ? 0 : 0.06);

  return (
    <section className="relative mx-auto max-w-6xl overflow-hidden px-5 pt-14 sm:px-8 sm:pt-20">
      <div
        ref={numeralRef}
        aria-hidden="true"
        className="pointer-events-none absolute -top-8 right-2 select-none font-display text-[8rem] leading-none text-ivory/[0.035] sm:text-[16rem]"
      >
        {section.index}
      </div>

      <div className="relative">
        <div className="flex items-center gap-4">
          <span className="h-px flex-1 bg-hairline" />
          <span className="caption-mono text-brass">
            {section.index} / {section.label.toUpperCase()}
          </span>
          <span className="h-px flex-1 bg-hairline" />
        </div>

        <Reveal variant="clip" className="mt-8">
          <h1 className="text-headline font-display tracking-tight text-ivory">
            {title}
          </h1>
        </Reveal>

        <div className="mt-6 grid gap-10 lg:grid-cols-12">
          <p className="max-w-xl text-lg leading-relaxed text-bone lg:col-span-7">
            {lead}
          </p>
          {note ? (
            <p className="caption-mono self-end text-fog lg:col-span-5 lg:justify-self-end lg:text-right">
              {note}
            </p>
          ) : null}
        </div>

        <div className="mt-14">{children}</div>
      </div>
    </section>
  );
}