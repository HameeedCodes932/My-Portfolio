"use client";

import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";
import { useTransitionNav } from "@/components/transition/TransitionProvider";
import Magnetic from "@/components/ui/Magnetic";
import { shouldUseNativeNavigation } from "@/lib/navigationEvents";

/**
 * CTA anchor that drives the cinematic section transition instead of a hard
 * navigation. Rendered as a next/link so the incoming section is prefetched
 * and ready behind the curtain; wrapped in a magnetic field.
 */
export default function CtaLink({
  href,
  children,
  variant = "solid",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "solid" | "ghost";
  className?: string;
}) {
  const { navigate } = useTransitionNav();

  const base =
    "group caption-mono inline-flex items-center gap-3 px-6 py-3.5 transition-transform duration-300 active:translate-y-px motion-reduce:transition-none";
  const styles =
    variant === "solid"
      ? "bg-ivory text-noir hover:bg-brass"
      : "border border-hairline text-ivory hover:border-brass/60 hover:text-brass";

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (shouldUseNativeNavigation(event)) return;
    event.preventDefault();
    navigate(href, {
      event,
      element: event.currentTarget,
      label:
        typeof children === "string"
          ? children
          : event.currentTarget.textContent?.trim(),
    });
  };

  return (
    <Magnetic>
      <Link
        href={href}
        onClick={onClick}
        data-robot-interactive="navigation"
        className={`${base} ${styles} ${className}`}
      >
        <span>{children}</span>
        <span
          aria-hidden="true"
          className="translate-x-0 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
        >
          →
        </span>
      </Link>
    </Magnetic>
  );
}