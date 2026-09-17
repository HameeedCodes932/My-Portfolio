"use client";

/* eslint-disable react-hooks/set-state-in-effect -- GSAP curtain state is synchronized from route/effect lifecycles. */

/**
 * Section transition architecture.
 *
 * Internal portfolio navigation can be robot-gated: the click is captured,
 * the robot confirms fingertip contact, then this provider starts the route
 * curtain and finally pushes the route.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import SiteHeader from "@/components/ui/SiteHeader";
import Footer from "@/components/ui/Footer";
import { getSectionByHref, TOTAL_SECTIONS } from "@/lib/sections";
import type { Section } from "@/lib/sections";
import { usePrefersReducedMotion } from "@/lib/motion";
import { useRobotDirector } from "@/components/scene/RobotDirector";
import {
  getTransitionReadyDelayMs,
  markTransitionTelemetry,
} from "@/lib/transitionTelemetry";

interface NavigateOptions {
  event?: ReactMouseEvent<HTMLElement>;
  element?: HTMLElement;
  label?: string;
  robot?: boolean;
  beforeNavigate?: () => void;
}

interface TransitionContextValue {
  navigate: (href: string, options?: NavigateOptions) => void;
}

const TransitionContext = createContext<TransitionContextValue>({
  navigate: () => {},
});

function nextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

export function useTransitionNav() {
  return useContext(TransitionContext);
}

export default function TransitionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { requestInteraction } = useRobotDirector();

  const stageRef = useRef<HTMLDivElement>(null);
  const curtainRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef(pathname);
  const busyRef = useRef(false);
  const firstRunRef = useRef(true);
  const destructivePathRef = useRef<string | null>(null);
  const pendingDestinationRef = useRef<{
    href: string;
    resolve: () => void;
  } | null>(null);

  const reduced = usePrefersReducedMotion();

  const [destination, setDestination] = useState<Section | null>(null);

  const reveal = useCallback(() => {
    const curtain = curtainRef.current;
    const stage = stageRef.current;
    const mark = markRef.current;
    if (!curtain || !stage || !mark) return;

    if (reduced) {
      gsap.set(mark, { autoAlpha: 0 });
      gsap.set(curtain, { yPercent: -105 });
      gsap.set(stage, { autoAlpha: 1, y: 0 });
      busyRef.current = false;
      setDestination(null);
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        busyRef.current = false;
        setDestination(null);
      },
    });

    gsap.set(stage, { autoAlpha: 0, y: 28 });
    tl.to(mark, { autoAlpha: 0, y: -8, duration: 0.22, ease: "power2.out" }, 0)
      .fromTo(
        curtain,
        { yPercent: 0 },
        { yPercent: -105, duration: 0.18, ease: "power2.out" }
      )
      .to(
        curtain,
        { yPercent: -105, duration: 0.62, ease: "power4.inOut" },
        0.18
      )
      .to(
        stage,
        { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out" },
        0.4
      );
  }, [reduced]);

  const cover = useCallback(
    (dest: Section | null, onDone: () => void) => {
      const curtain = curtainRef.current;
      const mark = markRef.current;
      if (!curtain || !mark) {
        onDone();
        return;
      }

      setDestination(dest);

      if (reduced) {
        gsap.set(mark, { autoAlpha: 0 });
        gsap.set(curtain, { yPercent: 0 });
        onDone();
        return;
      }

      gsap.fromTo(
        curtain,
        { yPercent: -105 },
        {
          yPercent: 0,
          duration: 0.48,
          ease: "power4.inOut",
          onComplete: () => {
            gsap.fromTo(
              mark,
              { autoAlpha: 0, y: 10 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.32,
                ease: "power3.out",
              }
            );
            onDone();
          },
        }
      );
    },
    [reduced]
  );

  useLayoutEffect(() => {
    gsap.set(curtainRef.current, { yPercent: 0 });
    gsap.set(markRef.current, { autoAlpha: 0 });
    gsap.set(stageRef.current, { autoAlpha: 0, y: 24 });
  }, []);

  useEffect(() => {
    reveal();
  }, [reveal]);

  useEffect(() => {
    pathRef.current = pathname;

    const pending = pendingDestinationRef.current;
    if (pending && pending.href === pathname) {
      pendingDestinationRef.current = null;
      markTransitionTelemetry("destinationMountedAt", { href: pathname });

      const finish = async () => {
        await nextFrame();
        await nextFrame();
        const delay = getTransitionReadyDelayMs();
        if (delay > 0) await sleep(delay);
        gsap.set(stageRef.current, { autoAlpha: 1, y: 0 });
        gsap.set(curtainRef.current, { yPercent: -105 });
        gsap.set(markRef.current, { autoAlpha: 0 });
        busyRef.current = false;
        setDestination(null);
        markTransitionTelemetry("destinationRevealAt", {
          href: pathname,
          simulatedDelayMs: delay,
        });
        pending.resolve();
      };

      void finish();
    }
  }, [pathname]);

  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    if (destructivePathRef.current === pathname) return;
    reveal();
  }, [pathname, reveal]);

  const commitDestructiveNavigation = useCallback(
    (href: string, beforeNavigate?: () => void) => {
      if (href === pathRef.current) {
        beforeNavigate?.();
        return Promise.resolve();
      }

      busyRef.current = true;
      destructivePathRef.current = href;
      const dest = getSectionByHref(href) ?? null;
      setDestination(dest);
      beforeNavigate?.();
      markTransitionTelemetry("routeCommitAt", { href });

      router.push(href, { scroll: true });

      return new Promise<void>((resolve) => {
        pendingDestinationRef.current = { href, resolve };
        window.setTimeout(() => {
          if (pendingDestinationRef.current?.href !== href) return;
          pendingDestinationRef.current = null;
          gsap.set(stageRef.current, { autoAlpha: 1, y: 0 });
          gsap.set(curtainRef.current, { yPercent: -105 });
          gsap.set(markRef.current, { autoAlpha: 0 });
          busyRef.current = false;
          setDestination(null);
          markTransitionTelemetry("destinationMountedAt", {
            href,
            fallback: true,
          });
          markTransitionTelemetry("destinationRevealAt", {
            href,
            fallback: true,
          });
          resolve();
        }, 4500);
      });
    },
    [router]
  );

  const runNavigation = useCallback(
    (href: string, beforeNavigate?: () => void) => {
      if (busyRef.current) return;

      if (href === pathRef.current) {
        beforeNavigate?.();
        return;
      }

      busyRef.current = true;
      const dest = getSectionByHref(href) ?? null;

      beforeNavigate?.();
      cover(dest, () => {
        router.push(href, { scroll: true });
        window.setTimeout(() => {
          if (busyRef.current) {
            busyRef.current = false;
            setDestination(null);
            gsap.set(curtainRef.current, { yPercent: -105 });
            gsap.set(markRef.current, { autoAlpha: 0 });
            gsap.set(stageRef.current, { autoAlpha: 1 });
          }
        }, 2500);
      });
    },
    [cover, router]
  );

  const navigate = useCallback(
    (href: string, options: NavigateOptions = {}) => {
      if (busyRef.current) return;

      if (href === pathRef.current) {
        options.beforeNavigate?.();
        return;
      }

      const element = options.element ?? options.event?.currentTarget ?? null;

      if (options.robot !== false && element) {
        requestInteraction({
          targetElement: element,
          action: () =>
            commitDestructiveNavigation(href, options.beforeNavigate),
          event: options.event,
          kind: "navigation",
          label:
            options.label ||
            element.textContent?.replace(/\s+/g, " ").trim() ||
            href,
        });
        return;
      }

      runNavigation(href, options.beforeNavigate);
    },
    [commitDestructiveNavigation, requestInteraction, runNavigation]
  );

  return (
    <TransitionContext.Provider value={{ navigate }}>
      <div ref={stageRef} data-transition-stage className="relative z-10">
        <SiteHeader />
        {children}
        <Footer />
      </div>

      <div
        ref={curtainRef}
        className="curtain pointer-events-none fixed inset-0 z-[90] will-change-transform"
        style={{ transform: "translateY(-100%)" }}
        aria-hidden="true"
      >
        <div className="curtain-sweep" />
        <div
          ref={markRef}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 will-change-transform"
        >
          {destination ? (
            <>
              <span className="caption-mono text-fog">
                SECTION {destination.index} / {TOTAL_SECTIONS}
              </span>
              <span className="font-display text-5xl italic tracking-tight text-ivory sm:text-7xl">
                {destination.label}
              </span>
              <span className="h-px w-16 bg-brass" aria-hidden="true" />
            </>
          ) : null}
        </div>
      </div>
    </TransitionContext.Provider>
  );
}
