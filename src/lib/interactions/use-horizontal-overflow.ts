import { useCallback, useEffect, useState, type RefObject } from "react";

type OverflowState = {
  hasOverflow: boolean;
  atStart: boolean;
  atEnd: boolean;
};

const EMPTY: OverflowState = { hasOverflow: false, atStart: true, atEnd: true };

/**
 * Reports whether a horizontally scrollable rail really has content outside the
 * viewport, so the fades/hints only appear when they are useful.
 */
export function useHorizontalOverflow(
  ref: RefObject<HTMLElement | null>,
  { enabled = true }: { enabled?: boolean } = {},
): OverflowState {
  const [state, setState] = useState<OverflowState>(EMPTY);

  const measure = useCallback(() => {
    const node = ref.current;
    if (!node || !enabled) {
      setState((current) => (current === EMPTY ? current : EMPTY));
      return;
    }
    const max = node.scrollWidth - node.clientWidth;
    const hasOverflow = max > 4;
    const next: OverflowState = {
      hasOverflow,
      atStart: !hasOverflow || node.scrollLeft <= 4,
      atEnd: !hasOverflow || node.scrollLeft >= max - 4,
    };
    setState((current) =>
      current.hasOverflow === next.hasOverflow &&
      current.atStart === next.atStart &&
      current.atEnd === next.atEnd
        ? current
        : next,
    );
  }, [enabled, ref]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    measure();
    node.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    for (const child of Array.from(node.children)) observer.observe(child);
    window.addEventListener("resize", measure);
    return () => {
      node.removeEventListener("scroll", measure);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, ref]);

  return state;
}

/** Centers an element inside its scroll container without touching page scroll. */
export function centerInRail(
  container: HTMLElement | null,
  element: HTMLElement | null,
  behavior: ScrollBehavior = "smooth",
): void {
  if (!container || !element) return;
  const target = element.offsetLeft - (container.clientWidth - element.offsetWidth) / 2;
  const max = container.scrollWidth - container.clientWidth;
  const left = Math.max(0, Math.min(target, max));
  if (Math.abs(left - container.scrollLeft) < 2) return;
  container.scrollTo({ left, behavior });
}
