"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  RefObject,
} from "react";
import { usePathname } from "next/navigation";
import { usePrefersReducedMotion } from "@/lib/motion";
import { useScrollLock } from "@/lib/scrollLock";
import {
  markTransitionTelemetry,
  resetTransitionTelemetry,
} from "@/lib/transitionTelemetry";
import DestructionTransition from "@/components/transition/DestructionTransition";

export const ROBOT_CONTACT_HOLD_MS = 500;

const INTRO_SESSION_KEY = "hameed-world-intro-played-v1";
const WELCOME_VOICE_SRC = "/audio/welcome-to-hameed-world.mp3";

export type RobotInteractionKind =
  | "menu"
  | "navigation"
  | "internal-action"
  | "intro";
export type RobotPointerMode = "pointer" | "keyboard";
export type RobotIntroPhase =
  | "checking"
  | "armed"
  | "activating"
  | "welcomeGesture"
  | "speaking"
  | "energyBuild"
  | "portalOpening"
  | "enteringHero"
  | "heroAssembly"
  | "robotLanding"
  | "complete";

export interface RobotTargetRect {
  kind: RobotInteractionKind;
  label: string;
  element: HTMLElement | null;
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  pointX: number;
  pointY: number;
  relativeX: number;
  relativeY: number;
  pointerMode: RobotPointerMode;
  viewportWidth: number;
  viewportHeight: number;
}

export interface ResolvedRobotTarget {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  pointX: number;
  pointY: number;
  viewportWidth: number;
  viewportHeight: number;
}

export type RobotCommand = {
  id: number;
  type: "interact";
  target: RobotTargetRect;
};

type RobotInteractionAction = () => void | Promise<void>;

interface RobotInteractionRequest {
  targetElement: HTMLElement;
  action: RobotInteractionAction;
  event?: ReactMouseEvent<HTMLElement> | MouseEvent | PointerEvent | null;
  kind?: RobotInteractionKind;
  label?: string;
}

interface TearState {
  id: number;
  target: RobotTargetRect;
  phase: "contact" | "opening";
}

interface DestructionState {
  id: number;
  target: RobotTargetRect;
}

interface PendingAction {
  id: number;
  action: RobotInteractionAction;
  timing: RobotInteractionTiming;
}

interface QueuedInteraction {
  target: RobotTargetRect;
  action: RobotInteractionAction;
  timing: RobotInteractionTiming;
}

interface RobotInteractionTiming {
  id: number;
  kind: RobotInteractionKind;
  label: string;
  pointerMode: RobotPointerMode;
  userClickAt: number;
  contactAt?: number;
  pressCompleteAt?: number;
  holdCompleteAt?: number;
  actionExecuteAt?: number;
}

interface RobotDirectorValue {
  command: RobotCommand | null;
  introActive: boolean;
  introPhase: RobotIntroPhase;
  robotBusy: boolean;
  reducedMotion: boolean;
  requestInteraction: (request: RobotInteractionRequest) => boolean;
  requestMenuOpen: (
    targetElement: HTMLElement,
    revealMenu: () => void,
    event?: ReactMouseEvent<HTMLElement> | MouseEvent | PointerEvent | null
  ) => boolean;
  signalRobotContact: (id: number) => void;
  finishCommand: (id: number) => void;
  markRobotReady: () => void;
  markRobotUnavailable: () => void;
}

const RobotDirectorContext = createContext<RobotDirectorValue | null>(null);

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function eventPoint(
  event?: ReactMouseEvent<HTMLElement> | MouseEvent | PointerEvent | null
) {
  if (!event) return null;
  const maybePoint = event as {
    clientX?: unknown;
    clientY?: unknown;
    detail?: unknown;
  };
  const hasClientPoint =
    typeof maybePoint.clientX === "number" &&
    typeof maybePoint.clientY === "number";
  const keyboardClick = maybePoint.detail === 0;

  if (!hasClientPoint || keyboardClick) return null;
  return {
    x: maybePoint.clientX as number,
    y: maybePoint.clientY as number,
  };
}

function elementLabel(element: HTMLElement, fallback: string) {
  return (
    element.getAttribute("aria-label") ||
    element.textContent?.replace(/\s+/g, " ").trim() ||
    fallback
  );
}

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function writeRobotInteractionTiming(timing: RobotInteractionTiming) {
  if (typeof window === "undefined") return;
  (
    window as Window & {
      __robotInteractionTiming?: RobotInteractionTiming;
    }
  ).__robotInteractionTiming = { ...timing };
}

function setRobotPressState(
  element: HTMLElement | null | undefined,
  pressed: boolean,
  id?: number
) {
  if (!element || !element.isConnected) return;

  if (pressed) {
    element.dataset.robotPressing = "true";
    if (typeof id === "number") element.dataset.robotPressId = String(id);
    element.classList.add("is-robot-pressing");
    return;
  }

  delete element.dataset.robotPressing;
  delete element.dataset.robotPressId;
  element.classList.remove("is-robot-pressing");
}

function captureTargetRect({
  targetElement,
  event,
  kind = "internal-action",
  label,
}: RobotInteractionRequest): RobotTargetRect {
  const rect = targetElement.getBoundingClientRect();
  const fallbackX = rect.left + rect.width / 2;
  const fallbackY = rect.top + rect.height / 2;
  const point = eventPoint(event);
  const pointX = point?.x ?? fallbackX;
  const pointY = point?.y ?? fallbackY;

  return {
    kind,
    label: label || elementLabel(targetElement, kind),
    element: targetElement,
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
    centerX: fallbackX,
    centerY: fallbackY,
    pointX,
    pointY,
    relativeX: clamp01((pointX - rect.left) / Math.max(1, rect.width)),
    relativeY: clamp01((pointY - rect.top) / Math.max(1, rect.height)),
    pointerMode: point ? "pointer" : "keyboard",
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  };
}

function PortfolioIntroGate({
  phase,
  ready,
  onStart,
  onSkip,
  targetRef,
}: {
  phase: RobotIntroPhase;
  ready: boolean;
  onStart: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onSkip: () => void;
  targetRef: RefObject<HTMLButtonElement | null>;
}) {
  const targetReady = ready && (phase === "armed" || phase === "activating");
  const welcomeVisible =
    phase === "welcomeGesture" ||
    phase === "speaking" ||
    phase === "energyBuild" ||
    phase === "portalOpening" ||
    phase === "enteringHero" ||
    phase === "heroAssembly";

  return (
    <div
      className={`portfolio-intro is-${phase}`}
      aria-hidden={phase === "checking" ? "true" : undefined}
    >
      <div className="portfolio-intro-surface" aria-hidden="true">
        <span className="portfolio-intro-panel portfolio-intro-panel-left" />
        <span className="portfolio-intro-panel portfolio-intro-panel-right" />
        <span className="portfolio-intro-fracture" />
      </div>
      <div className="portfolio-intro-depth" aria-hidden="true" />
      <div className="portfolio-intro-energy" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="portfolio-intro-copy">
        <span className="caption-mono text-fog">INITIALIZING ENTRY</span>
        <button
          ref={targetRef}
          type="button"
          onClick={onStart}
          aria-disabled={!targetReady}
          tabIndex={targetReady ? 0 : -1}
          data-robot-interactive="intro"
          className={`intro-entry-cta ${targetReady ? "is-ready" : ""}`}
        >
          Enter Hameed World
        </button>
        <div
          className={`portfolio-intro-welcome ${
            welcomeVisible ? "is-visible" : ""
          }`}
        >
          <span>Welcome to</span>
          <span>Hameed World.</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onSkip}
        className="portfolio-intro-skip caption-mono"
      >
        Skip intro
      </button>
    </div>
  );
}

export function resolveRobotTargetPoint(
  target: RobotTargetRect
): ResolvedRobotTarget {
  const rect = target.element?.isConnected
    ? target.element.getBoundingClientRect()
    : null;
  const left = rect?.left ?? target.left;
  const top = rect?.top ?? target.top;
  const width = rect?.width ?? target.width;
  const height = rect?.height ?? target.height;
  const right = rect?.right ?? left + width;
  const bottom = rect?.bottom ?? top + height;
  const pointX = left + clamp01(target.relativeX) * Math.max(1, width);
  const pointY = top + clamp01(target.relativeY) * Math.max(1, height);

  return {
    left,
    top,
    right,
    bottom,
    width,
    height,
    centerX: left + width / 2,
    centerY: top + height / 2,
    pointX,
    pointY,
    viewportWidth:
      typeof window === "undefined" ? target.viewportWidth : window.innerWidth,
    viewportHeight:
      typeof window === "undefined" ? target.viewportHeight : window.innerHeight,
  };
}

export function useRobotDirector() {
  const value = useContext(RobotDirectorContext);
  if (!value) {
    throw new Error("useRobotDirector must be used inside RobotDirector");
  }
  return value;
}

function RobotTearLayer({ tear }: { tear: TearState }) {
  const resolved = resolveRobotTargetPoint(tear.target);
  const style = {
    "--tear-x": `${resolved.pointX}px`,
    "--tear-y": `${resolved.pointY}px`,
    "--tear-w": `${Math.max(48, resolved.width)}px`,
    "--tear-h": `${Math.max(34, resolved.height)}px`,
  } as CSSProperties;

  return (
    <div
      className={`menu-tear-layer ${tear.phase === "opening" ? "is-opening" : ""}`}
      style={style}
      aria-hidden="true"
    >
      <div className="menu-tear-panel menu-tear-panel-left">
        <span className="menu-tear-edge menu-tear-edge-left" />
      </div>
      <div className="menu-tear-panel menu-tear-panel-right">
        <span className="menu-tear-edge menu-tear-edge-right" />
      </div>
      <span className="menu-tear-fracture" />
      <span className="menu-tear-grip menu-tear-grip-left" />
      <span className="menu-tear-grip menu-tear-grip-right" />
    </div>
  );
}

export default function RobotDirector({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reducedMotion = usePrefersReducedMotion();
  const commandIdRef = useRef(0);
  const commandRef = useRef<RobotCommand | null>(null);
  const pendingActionRef = useRef<PendingAction | null>(null);
  const queuedInteractionRef = useRef<QueuedInteraction | null>(null);
  const safetyTimerRef = useRef<number | null>(null);
  const pressHoldTimerRef = useRef<number | null>(null);
  const pressedElementRef = useRef<{ id: number; element: HTMLElement } | null>(
    null
  );
  const introTargetRef = useRef<HTMLButtonElement | null>(null);
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const introRequestedRef = useRef(false);
  const introTimersRef = useRef<number[]>([]);

  const [command, setCommand] = useState<RobotCommand | null>(null);
  const [tear, setTear] = useState<TearState | null>(null);
  const [destruction, setDestruction] = useState<DestructionState | null>(null);
  const [introPhase, setIntroPhase] = useState<RobotIntroPhase>("checking");
  const [robotBusy, setRobotBusy] = useState(false);
  const [robotAvailable, setRobotAvailable] = useState(true);
  const [robotReady, setRobotReady] = useState(false);
  const introActive = introPhase !== "complete";

  const clearSafetyTimer = useCallback(() => {
    if (safetyTimerRef.current !== null) {
      window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  const clearIntroTimers = useCallback(() => {
    introTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    introTimersRef.current = [];
  }, []);

  const stopIntroAudio = useCallback(() => {
    const audio = introAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  const prepareIntroAudio = useCallback(() => {
    if (introAudioRef.current) return;
    const audio = new Audio(WELCOME_VOICE_SRC);
    audio.preload = "auto";
    introAudioRef.current = audio;
  }, []);

  const playWelcomeVoice = useCallback(() => {
    const audio = introAudioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // The intro is fully visual when the optional voice file is absent or blocked.
    });
  }, []);

  const markIntroPlayed = useCallback(() => {
    try {
      window.sessionStorage.setItem(INTRO_SESSION_KEY, "true");
    } catch {
      // Session storage can be unavailable in locked-down browsers.
    }
  }, []);

  const clearActivePress = useCallback(() => {
    if (pressHoldTimerRef.current !== null) {
      window.clearTimeout(pressHoldTimerRef.current);
      pressHoldTimerRef.current = null;
    }

    const pressed = pressedElementRef.current;
    if (pressed) {
      setRobotPressState(pressed.element, false);
      pressedElementRef.current = null;
    }
  }, []);

  const runPendingAction = useCallback(async (id: number) => {
    const pending = pendingActionRef.current;
    if (!pending || pending.id !== id) return;
    pendingActionRef.current = null;
    writeRobotInteractionTiming({
      ...pending.timing,
      actionExecuteAt: nowMs(),
    });
    await pending.action();
  }, []);

  const finishCommand = useCallback(
    (id: number) => {
      if (commandRef.current?.id === id) commandRef.current = null;
      setCommand((current) => (current?.id === id ? null : current));
      setTear((current) => (current?.id === id ? null : current));
      setDestruction((current) => (current?.id === id ? null : current));
      setRobotBusy(false);
      clearActivePress();
      clearSafetyTimer();
    },
    [clearActivePress, clearSafetyTimer]
  );

  const signalRobotContact = useCallback(
    (id: number) => {
      const current = commandRef.current;
      const pending = pendingActionRef.current;
      if (!current || current.id !== id || !pending || pending.id !== id) return;
      if (pending.timing.contactAt) return;

      const contactAt = nowMs();
      const contactTiming = { ...pending.timing, contactAt };
      pendingActionRef.current = { ...pending, timing: contactTiming };
      writeRobotInteractionTiming(contactTiming);
      markTransitionTelemetry("contactAt", {
        id,
        kind: current.target.kind,
        label: current.target.label,
      });

      clearActivePress();
      if (current.target.element?.isConnected) {
        setRobotPressState(current.target.element, true, id);
        pressedElementRef.current = {
          id,
          element: current.target.element,
        };
      }

      pressHoldTimerRef.current = window.setTimeout(() => {
        pressHoldTimerRef.current = null;
        const heldPending = pendingActionRef.current;
        if (!heldPending || heldPending.id !== id) {
          clearActivePress();
          return;
        }

        const holdCompleteAt = nowMs();
        const pressTiming = {
          ...heldPending.timing,
          pressCompleteAt: holdCompleteAt,
          holdCompleteAt,
        };
        pendingActionRef.current = {
          ...heldPending,
          timing: pressTiming,
        };
        writeRobotInteractionTiming(pressTiming);
        clearActivePress();
        markTransitionTelemetry("holdCompleteAt", {
          id,
          kind: current.target.kind,
        });

        if (current.target.kind === "intro") {
          runPendingAction(id);
          return;
        }

        markTransitionTelemetry("destructionStartAt", {
          id,
          kind: current.target.kind,
        });
        setTear(null);
        setDestruction({ id, target: current.target });
      }, ROBOT_CONTACT_HOLD_MS);
    },
    [clearActivePress, runPendingAction]
  );

  const startInteraction = useCallback(
    ({ target, action, timing }: QueuedInteraction) => {
      if (reducedMotion || !robotAvailable || !robotReady) {
        const actionAt = nowMs();
        writeRobotInteractionTiming({
          ...timing,
          contactAt: actionAt,
          pressCompleteAt: actionAt,
          holdCompleteAt: actionAt,
          actionExecuteAt: actionAt,
        });
        action();
        return true;
      }

      const nextCommand = { id: timing.id, type: "interact", target } as const;

      clearSafetyTimer();
      clearActivePress();
      resetTransitionTelemetry({
        id: timing.id,
        kind: target.kind,
        label: target.label,
      });
      pendingActionRef.current = { id: timing.id, action, timing };
      setRobotBusy(true);
      commandRef.current = nextCommand;
      writeRobotInteractionTiming(timing);
      setCommand(nextCommand);
      setTear(null);

      safetyTimerRef.current = window.setTimeout(() => {
        runPendingAction(timing.id);
        commandRef.current = null;
        setCommand(null);
        setTear(null);
        setDestruction(null);
        setRobotBusy(false);
        clearActivePress();
      }, 9000);

      return true;
    },
    [
      clearActivePress,
      clearSafetyTimer,
      reducedMotion,
      robotAvailable,
      robotReady,
      runPendingAction,
    ]
  );

  const requestInteraction = useCallback(
    ({
      targetElement,
      action,
      event,
      kind = "internal-action",
      label,
    }: RobotInteractionRequest) => {
      const target = captureTargetRect({
        targetElement,
        action,
        event,
        kind,
        label,
      });
      const id = commandIdRef.current + 1;
      commandIdRef.current = id;
      const timing: RobotInteractionTiming = {
        id,
        kind: target.kind,
        label: target.label,
        pointerMode: target.pointerMode,
        userClickAt: nowMs(),
      };
      const interaction = { target, action, timing };

      if (robotBusy) {
        if (target.kind === "navigation") {
          queuedInteractionRef.current = interaction;
          writeRobotInteractionTiming(timing);
          return true;
        }
        return false;
      }

      return startInteraction(interaction);
    },
    [robotBusy, startInteraction]
  );

  useEffect(() => {
    if (robotBusy) return;
    const queued = queuedInteractionRef.current;
    if (!queued) return;
    queuedInteractionRef.current = null;

    if (!queued.target.element?.isConnected) return;
    startInteraction(queued);
  }, [robotBusy, startInteraction]);

  const requestMenuOpen = useCallback(
    (
      targetElement: HTMLElement,
      revealMenu: () => void,
      event?: ReactMouseEvent<HTMLElement> | MouseEvent | PointerEvent | null
    ) =>
      requestInteraction({
        targetElement,
        action: revealMenu,
        event,
        kind: "menu",
        label: "Menu",
      }),
    [requestInteraction]
  );

  const revealIntro = useCallback(() => {
    markIntroPlayed();
    clearIntroTimers();
    setIntroPhase("welcomeGesture");
    introTimersRef.current = [
      window.setTimeout(() => {
        setIntroPhase("speaking");
        playWelcomeVoice();
      }, 620),
      window.setTimeout(() => setIntroPhase("energyBuild"), 1550),
      window.setTimeout(() => setIntroPhase("portalOpening"), 2450),
      window.setTimeout(() => setIntroPhase("enteringHero"), 3350),
      window.setTimeout(() => setIntroPhase("heroAssembly"), 4250),
      window.setTimeout(() => setIntroPhase("robotLanding"), 5200),
      window.setTimeout(() => setIntroPhase("complete"), 6400),
    ];
  }, [clearIntroTimers, markIntroPlayed, playWelcomeVoice]);

  const startIntro = useCallback(
    (event?: ReactMouseEvent<HTMLButtonElement>) => {
      const target = introTargetRef.current;
      if (!target || introRequestedRef.current || introPhase !== "armed") return;
      if (robotAvailable && !robotReady) return;

      prepareIntroAudio();
      introRequestedRef.current = true;
      setIntroPhase("activating");
      const accepted = requestInteraction({
        targetElement: target,
        action: revealIntro,
        event,
        kind: "intro",
        label: "Enter Hameed World",
      });

      if (!accepted) {
        introRequestedRef.current = false;
        setIntroPhase("armed");
      }
    },
    [
      introPhase,
      prepareIntroAudio,
      requestInteraction,
      revealIntro,
      robotAvailable,
      robotReady,
    ]
  );

  const skipIntro = useCallback(() => {
    markIntroPlayed();
    stopIntroAudio();
    clearIntroTimers();
    clearSafetyTimer();
    clearActivePress();
    pendingActionRef.current = null;
    queuedInteractionRef.current = null;
    commandRef.current = null;
    setCommand(null);
    setTear(null);
    setDestruction(null);
    setRobotBusy(false);
    setIntroPhase("complete");
  }, [
    clearActivePress,
    clearIntroTimers,
    clearSafetyTimer,
    markIntroPlayed,
    stopIntroAudio,
  ]);

  const markRobotReady = useCallback(() => {
    setRobotAvailable(true);
    setRobotReady(true);
  }, []);

  const markRobotUnavailable = useCallback(() => {
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    queuedInteractionRef.current = null;
    pending?.action();
    setRobotAvailable(false);
    setRobotReady(false);
    setRobotBusy(false);
    commandRef.current = null;
    setCommand(null);
    setTear(null);
    setDestruction(null);
    clearActivePress();
    clearSafetyTimer();
  }, [clearActivePress, clearSafetyTimer]);

  useEffect(() => {
    introRequestedRef.current = false;
    clearIntroTimers();

    let nextIntroPhase: RobotIntroPhase = "armed";

    if (pathname !== "/") {
      nextIntroPhase = "complete";
    } else {
      const forceIntro =
        window.location.search.includes("intro=1") ||
        window.localStorage.getItem("forcePortfolioIntro") === "true";

      try {
        if (!forceIntro && window.sessionStorage.getItem(INTRO_SESSION_KEY) === "true") {
          nextIntroPhase = "complete";
        }
      } catch {
        // Fall through to the intro when storage cannot be read.
      }
    }

    const phaseTimer = window.setTimeout(() => {
      setIntroPhase(nextIntroPhase);
    }, 0);

    return () => window.clearTimeout(phaseTimer);
  }, [clearIntroTimers, pathname]);

  useScrollLock("intro", introActive);

  useEffect(() => {
    document.body.dataset.introPhase = introPhase;
    document.body.classList.toggle("portfolio-intro-active", introActive);
    return () => {
      delete document.body.dataset.introPhase;
      document.body.classList.remove("portfolio-intro-active");
    };
  }, [introActive, introPhase]);

  useEffect(() => {
    return () => {
      clearSafetyTimer();
      clearActivePress();
      clearIntroTimers();
      stopIntroAudio();
      pendingActionRef.current = null;
      queuedInteractionRef.current = null;
    };
  }, [clearActivePress, clearIntroTimers, clearSafetyTimer, stopIntroAudio]);

  const value = useMemo<RobotDirectorValue>(
    () => ({
      command,
      introActive,
      introPhase,
      robotBusy,
      reducedMotion,
      requestInteraction,
      requestMenuOpen,
      signalRobotContact,
      finishCommand,
      markRobotReady,
      markRobotUnavailable,
    }),
    [
      command,
      finishCommand,
      introActive,
      introPhase,
      markRobotReady,
      markRobotUnavailable,
      reducedMotion,
      requestInteraction,
      requestMenuOpen,
      robotBusy,
      signalRobotContact,
    ]
  );

  return (
    <RobotDirectorContext.Provider value={value}>
      {children}
      {introActive ? (
        <PortfolioIntroGate
          phase={introPhase}
          ready={robotReady || !robotAvailable}
          onStart={startIntro}
          onSkip={skipIntro}
          targetRef={introTargetRef}
        />
      ) : null}
      {tear ? <RobotTearLayer tear={tear} /> : null}
      {destruction ? (
        <DestructionTransition
          key={destruction.id}
          id={destruction.id}
          target={destruction.target}
          onRouteCommit={() => runPendingAction(destruction.id)}
          onComplete={() =>
            setDestruction((current) =>
              current?.id === destruction.id ? null : current
            )
          }
        />
      ) : null}
    </RobotDirectorContext.Provider>
  );
}
