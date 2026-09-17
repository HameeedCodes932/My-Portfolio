"use client";

import { useRef } from "react";
import { profile } from "@/lib/content";
import CtaLink from "@/components/ui/CtaLink";
import SectionIndex from "@/components/ui/SectionIndex";
import FigureFrame from "@/components/ui/FigureFrame";
import PlaceholderText from "@/components/ui/PlaceholderText";
import HeroAIWorld from "@/components/background/HeroAIWorld";
import { usePointerParallax, usePrefersReducedMotion } from "@/lib/motion";

const year = new Date().getFullYear();

/**
 * The landing index  -  a designed opening moment: ambient studio depth, a
 * two-line editorial masthead, staged entrances (CSS, reduced-motion safe),
 * pointer parallax across depth layers, and a cinematic figure frame awaiting
 * the portrait. The index table below drives everything else.
 */
export default function HeroSection() {
  const scopeRef = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  usePointerParallax(scopeRef);

  return (
    <section
      ref={scopeRef}
      data-hero-root
      className="relative mx-auto min-h-[calc(100vh-8.5rem)] max-w-6xl overflow-hidden px-5 pb-24 pt-14 sm:px-8 sm:pt-20"
    >
      <HeroAIWorld />

      {/* Fixed-depth right meta column (desktop) */}
      <div
        data-depth={reduced ? 0 : 18}
        className="absolute right-8 top-40 z-10 hidden flex-col items-end gap-6 text-right lg:flex"
        aria-hidden="true"
      >
        <span className="caption-mono max-w-[13rem] text-right text-fog">
          &ldquo;Building practical intelligence at the intersection of AI,
          software, and real-world problems.&rdquo;
        </span>
        <span className="caption-mono text-fog">
          FOCUS  -  {profile.focus.toUpperCase()}
        </span>
        <span className="flex flex-col items-end gap-1">
          <span className="h-px w-12 bg-brass" />
        </span>
      </div>

      <div className="relative z-10 grid gap-12 lg:grid-cols-12 lg:gap-8">
        {/* Masthead */}
        <div className="lg:col-span-7">
          <div
            data-hero-reveal="kicker"
            className="rise-in"
            style={reduced ? undefined : { animationDelay: "0ms" }}
          >
            <p className="caption-mono flex items-center gap-3 text-brass">
              <span className="h-px w-8 bg-brass" />
              Portfolio  -  {year}
            </p>
          </div>

          <div className="mt-8 overflow-hidden">
            <div
              data-depth={reduced ? 0 : 8}
              data-hero-reveal="title"
              className="rise-in"
              style={reduced ? undefined : { animationDelay: "90ms" }}
            >
              <h1 className="text-hero font-display tracking-tight text-ivory">
                Fazal
                <br />
                <span className="italic text-bone">Hameed</span>
              </h1>
            </div>
          </div>

          <div
            data-depth={reduced ? 0 : 12}
            data-hero-reveal="copy"
            className="rise-in mt-9"
            style={reduced ? undefined : { animationDelay: "200ms" }}
          >
            <div className="flex items-start gap-4">
              <span className="caption-mono pt-1 text-fog">01</span>
              <div>
                <p className="font-sans text-xl text-ivory sm:text-2xl">
                  {profile.heroLine}
                </p>
                <p className="mt-4 max-w-md leading-relaxed text-bone">
                  <PlaceholderText value={profile.intro} />
                </p>
              </div>
            </div>
          </div>

          <div
            data-hero-reveal="actions"
            className="rise-in mt-12 flex flex-wrap items-center gap-4"
            style={reduced ? undefined : { animationDelay: "300ms" }}
          >
            <CtaLink href="/projects" variant="solid">
              View projects
            </CtaLink>
            <CtaLink href="/contact" variant="ghost">
              Contact
            </CtaLink>
            <span className="caption-mono ml-2 hidden text-fog sm:inline">
              AI systems / full-stack craft
            </span>
          </div>
        </div>

        {/* Portrait / figure slot */}
        <div className="lg:col-span-5">
          <div
            data-depth={reduced ? 0 : 6}
            data-hero-reveal="portrait"
            className="rise-in h-full"
            style={reduced ? undefined : { animationDelay: "260ms" }}
          >
            <FigureFrame
              ghost="FH"
              src="/assets/my%20photo.jpg"
              alt="Fazal Hameed"
              label="PORTRAIT"
              caption="Fig. 00  -  Fazal Hameed"
              imageClassName="object-[58%_48%]"
            >
              Fazal Hameed
            </FigureFrame>
          </div>
        </div>
      </div>

      {/* Table of contents */}
      <div className="relative z-10 mt-24">
        <div
          className="mb-6 flex items-center justify-between"
        >
          <p className="caption-mono text-fog">
            CONTENTS  -  THE WHOLE SITE, INDEXED
          </p>
          <p className="caption-mono text-fog"> -  select a section</p>
        </div>
        <SectionIndex />
      </div>
    </section>
  );
}
