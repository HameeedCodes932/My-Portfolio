"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import {
  SECTIONS,
  TOTAL_SECTIONS,
  getSectionByHref,
} from "@/lib/sections";
import { useTransitionNav } from "@/components/transition/TransitionProvider";
import { useRobotDirector } from "@/components/scene/RobotDirector";
import { usePrefersReducedMotion } from "@/lib/motion";
import { shouldUseNativeNavigation } from "@/lib/navigationEvents";
import { useScrollLock } from "@/lib/scrollLock";

const year = new Date().getFullYear();

function ProgressHairline() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    let raf = 0;
    let last = -1;

    const update = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      const p = total > 0 ? Math.min(1, window.scrollY / total) : 0;
      if (Math.abs(p - last) < 0.002) return;
      last = p;
      bar.style.transform = `scaleX(${p.toFixed(4)})`;
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
    };
  }, []);

  return (
    <div className="absolute inset-x-0 top-0 h-[2px] bg-noir">
      <div
        ref={barRef}
        className="h-full w-full origin-left bg-gradient-to-r from-brass to-ivory/40"
        style={{ transform: "scaleX(0)" }}
        aria-hidden="true"
      />
    </div>
  );
}

export default function SiteHeader() {
  const pathname = usePathname();
  const { navigate } = useTransitionNav();
  const { requestMenuOpen, robotBusy } = useRobotDirector();
  const reduced = usePrefersReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuOpenRef = useRef(menuOpen);
  const lastPathnameRef = useRef(pathname);

  const current = getSectionByHref(pathname);

  useScrollLock("menu", menuOpen);

  useLayoutEffect(() => {
    menuOpenRef.current = menuOpen;
  }, [menuOpen]);

  useEffect(() => {
    if (lastPathnameRef.current === pathname) return;
    lastPathnameRef.current = pathname;
    const timer = window.setTimeout(() => setMenuOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        menuOpenRef.current &&
        !document.querySelector('[aria-label="Certificate plate"][role="dialog"]')
      ) {
        event.preventDefault();
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go =
    (href: string, label: string) => (event: MouseEvent<HTMLAnchorElement>) => {
      if (shouldUseNativeNavigation(event)) return;
      event.preventDefault();
      navigate(href, {
        event,
        element: event.currentTarget,
        label,
        beforeNavigate: () => setMenuOpen(false),
      });
    };

  const openMenu = (event: MouseEvent<HTMLButtonElement>) => {
    requestMenuOpen(event.currentTarget, () => setMenuOpen(true), event);
  };

  const menuOverlay = menuOpen ? (
    <div
      className="fixed inset-0 z-[70] h-dvh overflow-hidden bg-noir backdrop-in"
      role="dialog"
      aria-modal="true"
      aria-label="Section menu"
    >
      <div className="ambient" aria-hidden="true" />
      <div className="relative mx-auto flex h-dvh max-w-6xl flex-col px-5 py-5 sm:px-8">
        <div className="shrink-0 flex items-center justify-between">
          <span className="caption-mono text-fog">
            INDEX  -  01 / {TOTAL_SECTIONS}
          </span>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="caption-mono text-ivory transition-colors hover:text-brass"
          >
            CLOSE x
          </button>
        </div>

        <nav
          aria-label="Sections"
          className="mt-10 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-10"
        >
          <ol className="divide-y divide-hairline">
            {SECTIONS.map((section, i) => {
              const active = pathname === section.href;
              return (
                <li
                  key={section.id}
                  className="menu-in"
                  style={
                    reduced
                      ? undefined
                      : { animationDelay: `${80 + i * 35}ms` }
                  }
                >
                  <a
                    href={section.href}
                    onClick={go(section.href, section.label)}
                    data-robot-interactive="navigation"
                    aria-current={active ? "page" : undefined}
                    className={`group flex items-center gap-4 py-4 transition-colors duration-300 motion-reduce:transition-none ${
                      active
                        ? "text-ivory"
                        : "text-bone hover:text-ivory"
                    }`}
                  >
                    <span
                      className={`caption-mono ${
                        active ? "text-brass" : "text-fog"
                      }`}
                    >
                      {section.index}
                    </span>
                    <span className="font-display text-3xl italic">
                      {section.label}
                    </span>
                    {active ? (
                      <span className="h-px w-6 bg-brass" aria-hidden="true" />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="h-px w-0 bg-brass transition-[width] duration-300 motion-reduce:transition-none group-hover:w-4"
                      />
                    )}
                    <span className="ml-auto caption-mono hidden text-fog sm:block">
                      {section.short}
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>

        <p className="caption-mono shrink-0 pb-2 pt-8 text-fog">
          Fazal Hameed / Interactive Portfolio
        </p>
      </div>
    </div>
  ) : null;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-hairline bg-noir/70 backdrop-blur-md">
      <ProgressHairline />

      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
        <Link
          href="/"
          onClick={go("/", "Home")}
          data-robot-interactive="navigation"
          className="caption-mono flex items-center gap-2 text-bone transition-colors hover:text-ivory"
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brass" />
          {`Fazal Hameed  -  Folio / ${year}`}
        </Link>

        {/* Current-section readout (desktop) */}
        <span className="caption-mono hidden text-fog lg:block">
          {current
            ? `${current.index} / ${TOTAL_SECTIONS}  -  ${current.label.toUpperCase()}`
            : "INDEX"}
        </span>

        <button
          type="button"
          onClick={openMenu}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          data-robot-interactive="menu"
          disabled={robotBusy && !menuOpen}
          className="caption-mono order-last flex shrink-0 items-center gap-2 text-ivory transition-colors hover:text-brass disabled:cursor-wait disabled:text-fog motion-reduce:transition-none"
        >
          <span className={menuOpen ? "text-brass" : ""}>MENU</span>
          <span className="flex flex-col gap-[3px] px-1">
            <span
              className={`block h-px w-5 bg-current transition-transform duration-300 motion-reduce:transition-none ${
                menuOpen ? "translate-y-[4px] rotate-45" : ""
              }`}
            />
            <span
              className={`block h-px w-5 bg-current transition-transform duration-300 motion-reduce:transition-none ${
                menuOpen ? "-translate-y-[3.5px] -rotate-45" : ""
              }`}
            />
          </span>
        </button>

        {/* Desktop numbered index */}
        <nav aria-label="Sections" className="hidden lg:block">
          <ol className="flex items-end gap-1">
            {SECTIONS.map((section) => {
              const active = pathname === section.href;
              return (
                <li key={section.id}>
                  <a
                    href={section.href}
                    onClick={go(section.href, section.label)}
                    data-robot-interactive="navigation"
                    aria-current={active ? "page" : undefined}
                    className={`group grid grid-cols-[auto] items-center px-2 pb-1 pt-2 text-left transition-transform duration-300 motion-reduce:transition-none ${
                      active
                        ? "text-brass"
                        : "text-fog hover:text-bone"
                    }`}
                  >
                    <span className="caption-mono transition-colors motion-reduce:transition-none">
                      {section.index}
                      {active ? <span className="text-brass">.</span> : null}
                    </span>
                    <span className="grid max-w-0 grid-cols-[1fr] overflow-hidden transition-[max-width] duration-300 motion-reduce:max-w-full motion-reduce:transition-none group-hover:max-w-[9rem]">
                      <span className="caption-mono whitespace-nowrap pr-1 text-ivory/70 group-hover:text-ivory">
                        {section.label}
                      </span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </header>

      {menuOverlay && typeof document !== "undefined"
        ? createPortal(menuOverlay, document.body)
        : null}
    </>
  );
}
