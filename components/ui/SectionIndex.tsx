"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SECTIONS } from "@/lib/sections";
import { useTransitionNav } from "@/components/transition/TransitionProvider";
import { shouldUseNativeNavigation } from "@/lib/navigationEvents";

/**
 * Editorial table-of-contents used on the hero: numbered rows for every
 * section, hovering the row reveals its short description. Clicking drives
 * the same cinematic transition as the header nav.
 */
export default function SectionIndex() {
  const pathname = usePathname();
  const { navigate } = useTransitionNav();

  const onSectionClick =
    (href: string, label: string) => (event: MouseEvent<HTMLAnchorElement>) => {
      if (shouldUseNativeNavigation(event)) return;
      event.preventDefault();
      navigate(href, {
        event,
        element: event.currentTarget,
        label,
      });
    };

  return (
    <ol className="border-t border-hairline">
      {SECTIONS.map((section) => {
        const active = pathname === section.href;
        return (
          <li
            key={section.id}
            className="group border-b border-hairline transition-colors duration-300 hover:bg-ivory/[0.03]"
          >
            <Link
              href={section.href}
              onClick={onSectionClick(section.href, section.label)}
              data-robot-interactive="navigation"
              aria-current={active ? "page" : undefined}
              className="grid grid-cols-[3rem_auto_1fr_auto] items-center gap-3 py-5 sm:px-2"
            >
              <span
                className={`caption-mono ${
                  active ? "text-brass" : "text-fog transition-colors group-hover:text-brass"
                }`}
              >
                {section.index}
              </span>
              <span
                className={`font-display text-2xl transition-transform duration-300 group-hover:translate-x-1 sm:text-3xl ${
                  active ? "text-ivory" : "text-ivory/80"
                }`}
              >
                {section.label}
              </span>
              <span className="caption-mono hidden text-fog opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:block">
                {section.short}
              </span>
              <span
                aria-hidden="true"
                className={`text-brass transition-transform duration-300 ${
                  active ? "translate-x-0" : "translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                }`}
              >
                →
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}