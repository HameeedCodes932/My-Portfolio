"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { certifications } from "@/lib/content";
import PlaceholderText, {
  isPlaceholder,
} from "@/components/ui/PlaceholderText";
import { useScrollLock } from "@/lib/scrollLock";

const entries = certifications.entries;

/**
 * The credential archive. Rows are archival plates; selecting one opens a
 * lightbox presentation plate (no fabricated scans — the plate itself is
 * typeset from the metadata). Esc / arrows / backdrop / close all work, and
 * Tab is trapped while it is open.
 */
export default function CertArchive() {
  const [open, setOpen] = useState<number | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef(open);

  const isOpen = open !== null;

  useScrollLock("certificate", isOpen);

  useLayoutEffect(() => {
    openRef.current = open;
  }, [open]);

  const close = useCallback(() => {
    setOpen(null);
  }, []);

  const step = useCallback(
    (delta: number) => {
      setOpen((prev) => {
        if (prev === null) return prev;
        return (prev + delta + entries.length) % entries.length;
      });
    },
    []
  );

  // Keyboard: Esc closes, arrows rotate.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (openRef.current === null) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, step]);

  // Initial focus into the dialog + restore focus on close.
  useEffect(() => {
    if (isOpen) {
      const source = document.activeElement as HTMLElement | null;
      closeRef.current?.focus();
      return () => source?.focus?.();
    }
  }, [isOpen, open]);

  // Minimal focus trap between the three dialog controls.
  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key !== "Tab" || !isOpen) return;
    const nodes = [
      closeRef.current,
      prevRef.current,
      nextRef.current,
    ].filter(Boolean) as HTMLElement[];
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const lightbox = isOpen && entries[open] ? (
    <div
      ref={overlayRef}
      onKeyDown={onKeyDown}
      className="backdrop-in fixed inset-0 z-[80] h-dvh overflow-y-auto overscroll-contain bg-noir/95"
      role="dialog"
      aria-modal="true"
      aria-label="Certificate plate"
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("[data-lightbox-content]")) {
          close();
        }
      }}
    >
      <div className="ambient" aria-hidden="true" />

      <div
        className="relative mx-auto flex min-h-dvh w-full max-w-4xl flex-col items-center justify-start gap-6 px-5 py-8 sm:px-8 sm:py-10"
        data-lightbox-content
      >
        <div className="flex w-full max-w-3xl items-center justify-between">
          <span className="caption-mono text-fog">
            PCR — {isPlaceholder(entries[open].code) ? "?" : entries[open].code}
          </span>
          <span className="caption-mono text-fog">
            {String(open + 1).padStart(2, "0")} /{" "}
            {String(entries.length).padStart(2, "0")}
          </span>
        </div>

        <div className="aperture-in relative w-full max-w-md">
          <div className="stage-frame aspect-[3/4] w-full">
            <div className="absolute inset-x-8 top-8 bottom-8 flex flex-col items-center justify-center gap-6 text-center">
              <span className="caption-mono text-brass">
                <PlaceholderText value={entries[open].issuer} />
              </span>
              <span
                aria-hidden="true"
                className="font-display text-7xl italic leading-none text-ivory/[0.1]"
              >
                {entries[open].code}
              </span>
              <span className="font-display text-3xl italic leading-snug text-ivory">
                <PlaceholderText value={entries[open].title} />
              </span>
              <span className="caption-mono text-fog">
                ISSUED — <PlaceholderText value={entries[open].year} />
              </span>
              {entries[open].detail ? (
                <span className="max-w-sm text-sm leading-relaxed text-bone">
                  {entries[open].detail}
                </span>
              ) : null}
              {"verify" in entries[open] && entries[open].verify ? (
                <a
                  href={entries[open].verify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="caption-mono mt-2 inline-block border border-hairline px-3 py-1.5 text-brass transition-colors hover:border-brass/60 hover:text-ivory"
                >
                  VERIFY ↗
                </a>
              ) : null}
              <span className="text-sm italic text-fog">
                Document scan pending — no certificate image has been
                supplied yet.
              </span>
            </div>
            <div className="scanline" aria-hidden="true" />
          </div>
        </div>

        <p className="caption-mono max-w-lg text-center text-fog">
          Archival plate — make these plates your own scans when ready.
        </p>

        <div className="flex items-center gap-6">
          <button
            ref={prevRef}
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous certificate"
            className="caption-mono text-fog transition-colors hover:text-brass"
          >
            ← {isPlaceholder(entries[(open - 1 + entries.length) % entries.length].title) ? "PREV" : entries[(open - 1 + entries.length) % entries.length].title.slice(0, 12)}
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close certificate plate"
            className="caption-mono border border-hairline px-4 py-2 text-ivory transition-colors hover:border-brass/60 hover:text-brass"
          >
            CLOSE ✕
          </button>
          <button
            ref={nextRef}
            type="button"
            onClick={() => step(1)}
            aria-label="Next certificate"
            className="caption-mono text-fog transition-colors hover:text-brass"
          >
            NEXT →
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 grid grid-cols-[4rem_1fr_auto] items-center gap-4 border-b border-hairline pb-3">
        <span className="caption-mono text-fog">ID</span>
        <span className="caption-mono text-fog">CREDENTIAL</span>
        <span className="hidden caption-mono text-fog sm:block">ACTION</span>
      </div>

      <ol>
        {entries.map((entry, i) => (
          <li key={i} className="border-b border-hairline last:border-b-0">
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Open certificate plate ${i + 1}: ${entry.title}`}
              className="group grid w-full grid-cols-[4rem_1fr_auto] items-center gap-4 py-5 text-left transition-colors duration-300 hover:bg-ivory/[0.02] motion-reduce:transition-none"
            >
              <span className="caption-mono italic text-fog transition-colors group-hover:text-brass">
                <PlaceholderText value={entry.code} />
              </span>
              <span>
                <span className="font-display text-lg text-ivory italic">
                  <PlaceholderText value={entry.title} />
                </span>
                <span className="mt-0.5 block text-sm text-fog">
                  <PlaceholderText value={entry.issuer} />
                  <span className="mx-2 text-fog/40">/</span>
                  <PlaceholderText value={entry.year} />
                </span>
              </span>
              <span className="caption-mono text-fog transition-colors group-hover:text-brass">
                VIEW <span className="inline-block transition-transform duration-300 group-hover:translate-x-0.5">↗</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      {lightbox && typeof document !== "undefined"
        ? createPortal(lightbox, document.body)
        : null}
    </div>
  );
}
