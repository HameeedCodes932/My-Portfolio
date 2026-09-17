import type { ReactNode } from "react";
import { isPlaceholder } from "./PlaceholderText";

/**
 * Editorial dossier row: mono label on the left, value or children on the
 * right. Placeholder values render dimmed/italic automatically.
 */
export default function Field({
  label,
  value,
  children,
  dense = false,
}: {
  label: string;
  value?: string;
  children?: ReactNode;
  dense?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[7.5rem_1fr] gap-4 border-t border-hairline sm:grid-cols-[9.5rem_1fr] ${
        dense ? "py-2" : "py-4"
      }`}
    >
      <span className="caption-mono pt-0.5 text-fog">{label}</span>
      {children ?? (
        <span
          className={`${
            isPlaceholder(value ?? "")
              ? `italic text-fog ${dense ? "text-sm" : ""}`
              : `text-bone ${dense ? "text-sm" : ""}`
          }`}
        >
          {value}
        </span>
      )}
    </div>
  );
}