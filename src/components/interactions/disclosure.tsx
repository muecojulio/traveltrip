import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";

export type DisclosureProps = {
  /** Short always-visible summary; it is also the accessible name. */
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  count?: number;
  className?: string;
  /** Hint under the summary, e.g. "Tarifas que no cumplen los filtros". */
  description?: ReactNode;
};

/**
 * Collapsible panel that animates open/closed without jumping (grid rows
 * 0fr → 1fr) and keeps its `aria-expanded` state in sync. Collapsed content is
 * `inert`, so it stays out of the tab order and out of the a11y tree.
 */
export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  count,
  className,
  description,
}: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const triggerId = `${id}-trigger`;
  const panelId = `${id}-panel`;

  return (
    <div className={cx("overflow-hidden rounded-card border border-line bg-elev", className)}>
      <button
        type="button"
        id={triggerId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="tap press flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium text-ink">{summary}</span>
          {description ? (
            <span className="mt-0.5 block text-xs text-muted">{description}</span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {typeof count === "number" ? (
            <span className="rounded-full bg-lagoon-soft px-2 py-0.5 text-xs text-ink">
              {count}
            </span>
          ) : null}
          <ChevronDown
            aria-hidden="true"
            className={cx(
              "size-4 text-muted transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </span>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        data-open={open}
        inert={!open}
        className="disclosure-panel"
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
