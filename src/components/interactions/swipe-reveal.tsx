import { ChevronLeft, Ellipsis } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cx } from "@/lib/cx";
import {
  decideAxis,
  resolveReveal,
  revealOffset,
  shouldCancelClick,
  velocityFromSamples,
  type GestureAxis,
} from "@/lib/interactions/gesture";
import { useFinePointer } from "@/lib/interactions/use-media-query";

/** Nested controls opt out of the drag, so a tap or a scroll never turns into a swipe. */
const SURFACE_NON_DRAGGABLE =
  'a, button, input, select, textarea, label, [role="button"], [role="switch"], [role="link"], [role="tab"], [data-no-swipe]';

export type SwipeRevealProps = {
  children: ReactNode;
  /** Buttons revealed behind the surface. */
  actions: ReactNode;
  /** Accessible name of the actions panel, e.g. "Acciones del viaje guardado". */
  actionsLabel: string;
  /** Visible label of the always-available toggle. */
  toggleLabel?: string;
  className?: string;
};

type DragState = {
  active: boolean;
  dragging: boolean;
  pointerId: number;
  startX: number;
  startY: number;
  axis: GestureAxis;
  width: number;
  samples: { t: number; x: number }[];
};

/**
 * Card that can be swiped to reveal contextual actions — never the only way to
 * reach them: a visible toggle button opens and closes the same panel, and on
 * mouse-driven screens the actions are laid out inline instead of hidden.
 *
 * The gesture keeps its axis lock (vertical scrolling always wins), travels
 * only as far as the panel is wide, and swallows the click that follows a drag.
 */
export function SwipeReveal({
  children,
  actions,
  actionsLabel,
  toggleLabel = "Acciones",
  className,
}: SwipeRevealProps) {
  const [open, setOpen] = useState(false);
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const panelId = `reveal-${id}`;
  const finePointer = useFinePointer();
  const rootRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const suppressUntil = useRef(0);
  const state = useRef<DragState>({
    active: false,
    dragging: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    axis: "pending",
    width: 0,
    samples: [],
  });

  const visible = finePointer || open;

  function applyOffset(offset: number) {
    surfaceRef.current?.style.setProperty("--reveal-x", `${offset}px`);
  }

  /** Moves the surface to its resting position with the CSS transition on. */
  function settle(nextOpen: boolean) {
    const surface = surfaceRef.current;
    if (!surface) return;
    const width = panelRef.current?.offsetWidth ?? state.current.width;
    state.current.width = width;
    surface.classList.remove("is-dragging");
    surface.style.removeProperty("transition");
    applyOffset(nextOpen ? -width : 0);
    setOpen(nextOpen);
  }

  // Close when the pointer goes somewhere else, like any other overlay.
  useEffect(() => {
    if (!open || finePointer) return;
    function onPointerDown(event: PointerEvent) {
      const root = rootRef.current;
      if (root && !root.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [finePointer, open]);

  // Keep the panel aligned if its width changes while open.
  useEffect(() => {
    if (!open || finePointer) return;
    const measure = () => {
      const width = panelRef.current?.offsetWidth ?? 0;
      if (width) applyOffset(-width);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (panelRef.current) observer.observe(panelRef.current);
    return () => observer.disconnect();
  }, [finePointer, open]);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (finePointer) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const target = event.target as Element | null;
    if (target?.closest(SURFACE_NON_DRAGGABLE)) {
      state.current.active = false;
      return;
    }
    const drag = state.current;
    drag.active = true;
    drag.dragging = false;
    drag.pointerId = event.pointerId;
    drag.startX = event.clientX;
    drag.startY = event.clientY;
    drag.axis = "pending";
    drag.width = panelRef.current?.offsetWidth ?? 0;
    drag.samples = [];
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = state.current;
    if (finePointer || !drag.active || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (drag.axis === "pending") {
      drag.axis = decideAxis(dx, dy);
      if (drag.axis === "vertical") {
        drag.active = false;
        return;
      }
      if (drag.axis === "pending") return;
      drag.dragging = true;
      const surface = surfaceRef.current;
      if (surface) {
        surface.classList.add("is-dragging");
        surface.style.transition = "none";
      }
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Capture is best effort; the gesture still works without it.
      }
    }
    if (!drag.dragging) return;

    drag.samples.push({ t: event.timeStamp, x: dx });
    if (drag.samples.length > 6) drag.samples.shift();
    drag.width = panelRef.current?.offsetWidth ?? drag.width;
    applyOffset(revealOffset(dx, { open, width: drag.width }));
  }

  function finish(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = state.current;
    if (!drag.active) return;
    const dx = event.clientX - drag.startX;
    const wasDragging = drag.dragging;
    drag.active = false;
    drag.dragging = false;
    drag.pointerId = -1;
    if (!wasDragging || finePointer) return;

    const velocity = velocityFromSamples(drag.samples);
    const nextOpen = resolveReveal({
      offset: revealOffset(dx, { open, width: drag.width }),
      velocity,
      width: drag.width,
      open,
    });

    if (shouldCancelClick(dx)) {
      suppressUntil.current = event.timeStamp + 400;
      event.preventDefault();
    }
    settle(nextOpen);
  }

  function onPointerCancel() {
    const drag = state.current;
    const wasDragging = drag.dragging;
    drag.active = false;
    drag.dragging = false;
    drag.pointerId = -1;
    if (wasDragging) settle(open);
  }

  function onClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.timeStamp > suppressUntil.current) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function closeFromKeyboard() {
    settle(false);
    toggleRef.current?.focus();
  }

  return (
    <div
      ref={rootRef}
      data-swipe-reveal=""
      data-open={open}
      className={cx(
        "relative overflow-hidden rounded-card border border-line bg-elev",
        finePointer && "flex flex-col",
        className,
      )}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open && !finePointer) closeFromKeyboard();
      }}
      onClickCapture={onClickCapture}
    >
      <div
        ref={surfaceRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={onPointerCancel}
        className="swipe-surface relative bg-elev"
      >
        {children}
        {!finePointer ? (
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => settle(!open)}
            className="tap press absolute top-2 right-2 inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-xs font-medium text-lagoon"
          >
            {open ? (
              <ChevronLeft aria-hidden="true" className="size-4" />
            ) : (
              <Ellipsis aria-hidden="true" className="size-4" />
            )}
            {open ? "Cerrar" : toggleLabel}
          </button>
        ) : null}
      </div>
      <div
        ref={panelRef}
        id={panelId}
        aria-label={actionsLabel}
        aria-hidden={!visible}
        inert={!visible}
        className={cx(
          "swipe-actions items-center gap-2 bg-lagoon-soft/60 p-2",
          finePointer
            ? "static flex flex-wrap border-t border-line"
            : "absolute inset-y-0 right-0 flex",
        )}
      >
        {actions}
      </div>
    </div>
  );
}
