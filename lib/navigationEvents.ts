import type { MouseEvent as ReactMouseEvent } from "react";

export function shouldUseNativeNavigation(
  event: ReactMouseEvent<HTMLElement>
) {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}