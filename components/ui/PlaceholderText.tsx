/**
 * Renders a string with a clearly-visible placeholder treatment whenever its
 * value is a bracketed "[...] pending" token from lib/content.ts.
 */
export function isPlaceholder(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith("[") && trimmed.endsWith("]");
}

export default function PlaceholderText({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  if (isPlaceholder(value)) {
    return (
      <span className={`italic text-fog ${className}`}>
        {value}
      </span>
    );
  }
  return <span className={className}>{value}</span>;
}