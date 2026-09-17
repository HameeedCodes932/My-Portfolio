"use client";

import { useEffect } from "react";

type LockSnapshot = {
  scrollY: number;
  bodyOverflow: string;
  bodyPaddingRight: string;
  bodyOverscrollBehavior: string;
  documentOverflow: string;
  documentOverscrollBehavior: string;
};

const owners = new Map<string, number>();
let snapshot: LockSnapshot | null = null;

function scrollbarWidth() {
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
}

function applyLock() {
  const scrollY = window.scrollY;
  const width = scrollbarWidth();

  snapshot = {
    scrollY,
    bodyOverflow: document.body.style.overflow,
    bodyPaddingRight: document.body.style.paddingRight,
    bodyOverscrollBehavior: document.body.style.overscrollBehavior,
    documentOverflow: document.documentElement.style.overflow,
    documentOverscrollBehavior: document.documentElement.style.overscrollBehavior,
  };

  document.documentElement.style.overflow = "hidden";
  document.documentElement.style.overscrollBehavior = "none";
  document.body.style.overflow = "hidden";
  document.body.style.overscrollBehavior = "none";
  if (width > 0) document.body.style.paddingRight = `${width}px`;
}

function clearLock() {
  if (!snapshot) return;

  const { scrollY } = snapshot;
  document.documentElement.style.overflow = snapshot.documentOverflow;
  document.documentElement.style.overscrollBehavior = snapshot.documentOverscrollBehavior;
  document.body.style.overflow = snapshot.bodyOverflow;
  document.body.style.overscrollBehavior = snapshot.bodyOverscrollBehavior;
  document.body.style.paddingRight = snapshot.bodyPaddingRight;
  snapshot = null;
  window.scrollTo(0, scrollY);
}

export function acquireScrollLock(owner: string) {
  const current = owners.get(owner) ?? 0;
  owners.set(owner, current + 1);

  if (owners.size === 1 && current === 0) {
    applyLock();
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;

    const count = owners.get(owner) ?? 0;
    if (count <= 1) {
      owners.delete(owner);
    } else {
      owners.set(owner, count - 1);
    }

    if (owners.size === 0) {
      clearLock();
    }
  };
}

export function useScrollLock(owner: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    return acquireScrollLock(owner);
  }, [enabled, owner]);
}
