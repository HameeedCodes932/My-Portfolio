"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Footer "back to top" control. Appears as an affordance once the page is
 * scrolled past the fold; scrolls smoothly (instant when reduced-motion).
 */
export default function ScrollTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const pastFold = () => window.scrollY > window.innerHeight * 0.6;

    const raf = requestAnimationFrame(() => setVisible(pastFold()));
    const onScroll = () => setVisible(pastFold());

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const onClick = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.scrollTo(0, 0);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Back to top"
      className={`caption-mono flex items-center gap-2 text-fog transition-all duration-300 hover:text-brass motion-reduce:transition-none ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <span aria-hidden="true">↑</span>
      BACK TO TOP
    </button>
  );
}