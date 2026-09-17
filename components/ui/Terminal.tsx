"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/motion";

/**
 * Typed console line. Types `lines` out character by character with a
 * blinking caret, then idles. Purely decorative duplication of text that is
 * already readable in the dossier next to it, so it is hidden from AT.
 */
export default function Terminal({
  lines,
  title = "session",
  className = "",
}: {
  lines: string[];
  title?: string;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const full = lines.join("\n");
  const total = full.length;
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    if (reduced) {
      const id = window.setTimeout(() => setTyped(total), 0);
      return () => window.clearTimeout(id);
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(i);
      if (i >= total) window.clearInterval(id);
    }, 16);
    return () => window.clearInterval(id);
  }, [reduced, total]);

  const headLines = full.slice(0, typed).split("\n");
  const rows = lines.map((line, i) => ({
    text: line,
    shown: headLines[i] ?? "",
  }));
  const activeRow = rows.findIndex((r) => r.shown.length < r.text.length);

  return (
    <div
      aria-hidden="true"
      className={`overflow-hidden border border-hairline bg-noir/80 font-mono text-[13px] leading-relaxed ${className}`}
    >
      <div className="flex items-center justify-between border-b border-hairline px-4 py-2">
        <span className="flex gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-fog/60" />
          <span className="h-1.5 w-1.5 rounded-full bg-fog/40" />
          <span className="h-1.5 w-1.5 rounded-full bg-fog/30" />
        </span>
        <span className="caption-mono text-fog">{title}</span>
      </div>
      <div className="min-h-[9rem] px-4 py-3">
        {rows.map((row, i) => (
          <p key={i} className="whitespace-pre-wrap break-words text-bone">
            <span className="text-brass">▸&nbsp;</span>
            {row.shown}
            {i === (activeRow === -1 ? rows.length - 1 : activeRow) ? (
              <span className="caret" />
            ) : null}
          </p>
        ))}
      </div>
    </div>
  );
}