export type TransitionTelemetryKey =
  | "contactAt"
  | "holdCompleteAt"
  | "destructionStartAt"
  | "impactAt"
  | "routeCommitAt"
  | "destinationMountedAt"
  | "destinationRevealAt"
  | "outgoingSurfaceRemovedAt"
  | "transitionCompleteAt";

export type TransitionTelemetry = Partial<Record<TransitionTelemetryKey, number>> & {
  order?: Array<{ key: TransitionTelemetryKey; at: number }>;
  metadata?: Record<string, unknown>;
};

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function markTransitionTelemetry(
  key: TransitionTelemetryKey,
  metadata?: Record<string, unknown>
) {
  if (typeof window === "undefined") return 0;

  const at = nowMs();
  const targetWindow = window as Window & {
    __portfolioTransitionTelemetry?: TransitionTelemetry;
  };
  const current = targetWindow.__portfolioTransitionTelemetry ?? {};
  const order = [...(current.order ?? []), { key, at }];

  targetWindow.__portfolioTransitionTelemetry = {
    ...current,
    [key]: at,
    order,
    metadata: {
      ...(current.metadata ?? {}),
      ...(metadata ?? {}),
    },
  };

  if (process.env.NODE_ENV !== "production") {
    console.debug(`[transition] ${key}`, {
      at,
      ...(metadata ?? {}),
    });
  }

  return at;
}

export function resetTransitionTelemetry(metadata?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  (window as Window & {
    __portfolioTransitionTelemetry?: TransitionTelemetry;
  }).__portfolioTransitionTelemetry = {
    order: [],
    metadata: metadata ?? {},
  };
}

export function getTransitionReadyDelayMs() {
  if (typeof window === "undefined") return 0;

  const targetWindow = window as Window & {
    __portfolioTransitionReadyDelayMs?: number;
  };
  const runtimeDelay = Number(targetWindow.__portfolioTransitionReadyDelayMs);
  const storedDelay = Number(
    window.localStorage.getItem("portfolioTransitionReadyDelayMs") ?? 0
  );
  const envDelay = Number(
    process.env.NEXT_PUBLIC_TRANSITION_READY_DELAY_MS ?? 0
  );

  const delay = [runtimeDelay, storedDelay, envDelay].find(
    (value) => Number.isFinite(value) && value > 0
  );

  return delay ? Math.min(delay, 3000) : 0;
}
