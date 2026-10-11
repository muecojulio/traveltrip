import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { sectionPanelId, sectionTabId } from "@/lib/interactions/dom-ids";
import { centerInRail, useHorizontalOverflow } from "@/lib/interactions/use-horizontal-overflow";
import {
  preferredScrollBehavior,
  usePrefersReducedMotion,
} from "@/lib/interactions/use-media-query";

export type SectionTabItem = {
  id: string;
  label: string;
  icon?: ReactNode;
};

export type SectionTabBarProps = {
  items: SectionTabItem[];
  value: string;
  onChange: (id: string) => void;
  /** Accessible name of the tab list. */
  label: string;
  idPrefix: string;
  /** `bar` fills the width (bottom navigation), `pill` hugs its content. */
  variant?: "bar" | "pill";
  className?: string;
};

/**
 * Tabs with full keyboard support (arrows, Home/End), roving tabindex and an
 * indicator that slides to the active tab. The list scrolls natively when the
 * tabs do not fit, keeps the active tab centred, and shows edge fades only when
 * something is really off-screen.
 */
export function SectionTabBar({
  items,
  value,
  onChange,
  label,
  idPrefix,
  variant = "bar",
  className,
}: SectionTabBarProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement | null>());
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const overflow = useHorizontalOverflow(listRef);
  const reducedMotion = usePrefersReducedMotion();
  const index = Math.max(
    0,
    items.findIndex((item) => item.id === value),
  );

  useEffect(() => {
    const list = listRef.current;
    const active = buttons.current.get(value);
    if (!list || !active) return;
    const measure = () => {
      setIndicator({ left: active.offsetLeft, width: active.offsetWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    observer.observe(active);
    return () => observer.disconnect();
  }, [items, value]);

  useEffect(() => {
    if (!overflow.hasOverflow) return;
    centerInRail(
      listRef.current,
      buttons.current.get(value) ?? null,
      preferredScrollBehavior(reducedMotion),
    );
  }, [overflow.hasOverflow, reducedMotion, value]);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const last = items.length - 1;
    let next = -1;
    if (event.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onChange(items[index].id);
      return;
    } else return;
    event.preventDefault();
    const target = items[next];
    onChange(target.id);
    buttons.current.get(target.id)?.focus();
  }

  return (
    <div className={cx("relative", className)}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        className={cx(
          "rail scrollbar-none relative flex overflow-x-auto overscroll-x-contain",
          variant === "bar" ? "items-stretch" : "items-center gap-1 p-1",
        )}
      >
        <span
          aria-hidden="true"
          className={cx(
            "tab-indicator pointer-events-none absolute transition-[transform,width] duration-200 ease-soft",
            variant === "bar"
              ? "top-1 bottom-1 rounded-2xl bg-clay/12"
              : "top-1 bottom-1 rounded-full bg-clay/12",
          )}
          style={{
            transform: `translateX(${indicator?.left ?? 0}px)`,
            width: indicator ? `${indicator.width}px` : 0,
            opacity: indicator ? 1 : 0,
          }}
        />
        {items.map((item) => {
          const active = item.id === value;
          return (
            <button
              key={item.id}
              ref={(node) => {
                buttons.current.set(item.id, node);
              }}
              type="button"
              role="tab"
              id={sectionTabId(idPrefix, item.id)}
              aria-selected={active}
              aria-controls={sectionPanelId(idPrefix, item.id)}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(item.id)}
              className={cx(
                "tap press relative z-1 flex flex-col items-center justify-center gap-1 text-xs font-medium",
                variant === "bar" ? "min-h-16 flex-1 px-2" : "min-h-11 px-3",
                active ? "text-clay" : "text-muted",
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
      {overflow.hasOverflow && !overflow.atStart ? (
        <span aria-hidden="true" className="rail-fade rail-fade-start" />
      ) : null}
      {overflow.hasOverflow && !overflow.atEnd ? (
        <span aria-hidden="true" className="rail-fade rail-fade-end" />
      ) : null}
    </div>
  );
}
