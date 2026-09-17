"use client";

import { useCallback, useState } from "react";
import type { KeyboardEvent } from "react";
import { lexbot, otherProjects } from "@/lib/content";
import type { Project } from "@/lib/content";
import Terminal from "@/components/ui/Terminal";
import Field from "@/components/ui/Field";
import ProjectLinks from "@/components/projects/ProjectLinks";

const CASES: Project[] = [lexbot, ...otherProjects];

/**
 * The Ledger of Work — a cinematic case-study browser, not a card grid.
 *
 * Left: the five cases as an editorial index. Right: the selected dossier,
 * with a keyed crossfade between cases. LexBot (01) is treated as the
 * flagship: its "proof" is a live typed terminal rather than a still.
 * Arrow-key navigation works inside the dossier region.
 */
export default function ProjectLedger() {
  const [active, setActive] = useState(0);
  const project = CASES[active];

  const step = useCallback(
    (delta: number) => {
      setActive((prev) => (prev + delta + CASES.length) % CASES.length);
    },
    []
  );

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
    }
  };

  const prev = CASES[(active - 1 + CASES.length) % CASES.length];
  const next = CASES[(active + 1) % CASES.length];
  const flagship = active === 0;

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
      {/* Case index */}
      <div className="lg:col-span-4">
        <p className="caption-mono mb-2 text-fog">THE CASES — 05</p>
        <ol className="border-t border-hairline" aria-label="Project cases">
          {CASES.map((item, i) => {
            const selected = i === active;
            return (
              <li key={item.numeral} className="border-b border-hairline">
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setActive(i)}
                  className={`group flex w-full items-center gap-4 py-5 text-left transition-all duration-300 motion-reduce:transition-none ${
                    selected
                      ? "translate-x-0 border-l border-brass pl-5"
                      : "border-l border-transparent pl-5 hover:translate-x-1"
                  }`}
                >
                  <span
                    className={`caption-mono ${
                      selected
                        ? "text-brass"
                        : "text-fog transition-colors group-hover:text-brass"
                    }`}
                  >
                    {item.numeral}
                  </span>
                  <span className="flex-1">
                    <span
                      className={`block font-display text-2xl transition-colors motion-reduce:transition-none ${
                        selected ? "text-ivory" : "text-ivory/70 group-hover:text-ivory"
                      }`}
                    >
                      {item.name}
                    </span>
                    <span className="mt-0.5 block text-sm text-fog">
                      {item.classification}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`text-brass transition-transform duration-300 motion-reduce:transition-none ${
                      selected ? "translate-x-0" : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                    }`}
                  >
                    →
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Active case dossier */}
      <div
        key={project.numeral}
        className="case-in lg:col-span-8"
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="group"
        aria-label={`Case study: ${project.name}`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="caption-mono text-brass">{project.classification}</span>
          <span className="caption-mono border border-brass/40 px-2 py-0.5 text-brass">
            {project.category.toUpperCase()}
          </span>
          {flagship ? (
            <span className="caption-mono border border-hairline px-2 py-0.5 text-fog">
              FLAGSHIP
            </span>
          ) : null}
        </div>

        <div className="relative mt-5">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-2 -top-10 select-none font-display text-[7rem] leading-none text-ivory/[0.05] sm:-left-4 sm:text-[11rem]"
          >
            {project.numeral}
          </span>
          <h2 className="text-headline relative font-display tracking-tight text-ivory">
            {project.name.split(" ")[0]}{" "}
            <span className="italic text-bone">
              {project.name.split(" ").slice(1).join(" ") || ""}
            </span>
          </h2>
          <p className="relative mt-4 max-w-xl text-lg leading-relaxed text-bone italic">
            {project.oneLiner}
          </p>
        </div>

        {/* Proof frame */}
        <div className="relative mt-8">
          {flagship ? (
            <Terminal
              title="lexbot — session"
              lines={["initialising model · loading context…", project.oneLiner]}
            />
          ) : (
            <div className="stage-frame aspect-[16/9] w-full">
              <div className="absolute inset-0 flex items-center justify-center gap-3">
                <span className="font-display text-4xl italic text-ivory/[0.1]">
                  {project.numeral}
                </span>
              </div>
              <span className="caption-mono absolute left-4 top-4 text-fog">
                FIG.0{Number(project.numeral)}
              </span>
              <span className="caption-mono absolute bottom-4 right-4 text-fog">
                VISUAL PENDING
              </span>
              <div className="scanline" aria-hidden="true" />
            </div>
          )}
          <p className="mt-3 text-center">
            <span className="caption-mono text-fog">
              {flagship
                ? "LexBot, live session — screen pending"
                : `Fig. 0${Number(project.numeral)} — ${project.name}, screen placeholder`}
            </span>
          </p>
        </div>

        {/* Dossier */}
        <div className="mt-8 grid gap-x-8 lg:grid-cols-2">
          <div>
            <Field label="Problem" value={project.problem} />
            <Field label="Solution" value={project.solution} />
            <Field label="Status">
              <p className="text-sm italic text-bone">{project.status}</p>
            </Field>
          </div>
          <div>
            <Field label="Key functionality">
              <ul className="space-y-1.5 text-bone">
                {project.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-3 text-sm italic">
                    <span className="text-brass">/</span>
                    {highlight}
                  </li>
                ))}
              </ul>
            </Field>
            <Field label="Technology">
              <ul className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-bone">
                {project.stack.map((item, i) => (
                  <li key={item} className="italic">
                    {item}
                    {i < project.stack.length - 1 ? " ," : ""}
                  </li>
                ))}
              </ul>
            </Field>
            <Field label="Links">
              <div className="pt-1">
                <ProjectLinks project={project} />
              </div>
            </Field>
          </div>
        </div>

        {/* Prev / next */}
        <div className="mt-10 flex items-center justify-between border-t border-hairline pt-5">
          <button
            type="button"
            onClick={() => step(-1)}
            className="group flex items-center gap-3 text-left"
          >
            <span aria-hidden="true" className="text-brass transition-transform duration-300 motion-reduce:transition-none group-hover:-translate-x-1">
              ←
            </span>
            <span className="caption-mono text-fog group-hover:text-bone">
              {prev.numeral} — {prev.name}
            </span>
          </button>
          <span className="caption-mono hidden text-fog sm:block">
            {active + 1} / {CASES.length}
          </span>
          <button
            type="button"
            onClick={() => step(1)}
            className="group flex items-center gap-3 text-right"
          >
            <span className="caption-mono text-fog group-hover:text-bone">
              {next.numeral} — {next.name}
            </span>
            <span aria-hidden="true" className="text-brass transition-transform duration-300 motion-reduce:transition-none group-hover:translate-x-1">
              →
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}