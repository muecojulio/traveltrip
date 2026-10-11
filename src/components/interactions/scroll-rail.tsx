import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { centerInRail, useHorizontalOverflow } from "@/lib/interactions/use-horizontal-overflow";
import {
  preferredScrollBehavior,
  usePrefersReducedMotion,
} from "@/lib/interactions/use-media-query";

export type RailSnap = "none" | "proximity" | "mandatory";

export type ScrollRailProps = {
  /** Accessible name of the group: "Destino", "Filtros", "Clima"… */
  label: string;
  children: ReactNode;
  role?: "group" | "list" | "radiogroup" | "toolbar";
  className?: string;
  railClassName?: string;
  /** Space between items. */
  gapClassName?: string;
  snap?: RailSnap;
  /** `center` when the cards are the composition, `start` for chips. */
  itemSnap?: "start" | "center";
  /**
   * Value identifying the selected item. When it changes, that item is scrolled
   * back into view (centred) without ever moving the page.
   */
  activeValue?: string | null;
  /**
   * Turns the rail into a grid from the given breakpoint on, for screens where
   * a carousel is a worse use of space (e.g. "sm:grid sm:grid-cols-2").
   */
  gridClassName?: string;
  /** Subtle "swipe" hint shown only while there is real overflow and no scroll yet. */
  hintLabel?: string;
  /** Scrollable regions stay keyboard reachable unless their items already are. */
  focusable?: boolean;
};

/**
 * Horizontal list built on native scrolling: momentum, snapping and browser
 * gestures stay untouched. We only add a visually hidden scrollbar, edge fades
 * that appear while content is actually off-screen, and a guarantee that the
 * selected item stays visible.
 */
export function ScrollRail({
  label,
  children,
  role = "group",
  className,
  railClassName,
  gapClassName = "gap-2",
  snap = "proximity",
  itemSnap = "start",
  activeValue,
  gridClassName,
  hintLabel = "Desliza",
  focusable = true,
}: ScrollRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [hintSeen, setHintSeen] = useState(false);
  const overflow = useHorizontalOverflow(railRef);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!overflow.hasOverflow || overflow.atStart) return;
    setHintSeen(true);
  }, [overflow.atStart, overflow.hasOverflow]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !activeValue) return;
    const escaped = activeValue.replace(/["\\]/g, "\\$&");
    const item = rail.querySelector<HTMLElement>(`[data-rail-value="${escaped}"]`);
    centerInRail(rail, item, preferredScrollBehavior(reducedMotion));
  }, [activeValue, reducedMotion]);

  return (
    <div className={cx("rail-shell relative", className)} data-rail-shell>
      <div
        ref={railRef}
        data-rail=""
        data-snap={snap === "none" ? undefined : itemSnap}
        role={role}
        aria-label={label}
        tabIndex={focusable ? 0 : undefined}
        className={cx(
          "rail flex overflow-x-auto overscroll-x-contain py-1",
          // In grid mode the rail can overflow vertically, and a native scrollbar
          // there is a better cue than a hidden one.
          !gridClassName && "scrollbar-none",
          gapClassName,
          snap === "mandatory" && "snap-x snap-mandatory",
          snap === "proximity" && "snap-x snap-proximity",
          gridClassName,
          railClassName,
        )}
      >
        {children}
      </div>

      {overflow.hasOverflow && !overflow.atStart ? (
        <span aria-hidden="true" className="rail-fade rail-fade-start" />
      ) : null}
      {overflow.hasOverflow && !overflow.atEnd ? (
        <span aria-hidden="true" className="rail-fade rail-fade-end" />
      ) : null}
      {overflow.hasOverflow && !hintSeen && hintLabel ? (
        <span aria-hidden="true" className="rail-hint">
          {hintLabel}
        </span>
      ) : null}
    </div>
  );
}
