import {
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  AXIS_START_PX,
  decideAxis,
  shouldCancelClick,
  velocityFromSamples,
  type GestureAxis,
} from "./gesture";

export type SwipeDirection = "forward" | "backward";

/** Never start a panel change from one of these. */
export const PANEL_SWIPE_IGNORE =
  'a, button, input, select, textarea, label, summary, [role="button"], [role="tab"], [role="switch"],' +
  ' [role="combobox"], [role="listbox"], [role="option"], [role="radio"], [role="slider"], [contenteditable="true"],' +
  " [data-rail], [data-swipe-reveal], [data-swipe-ignore]";

type Point = { t: number; x: number };

type SwipeState = {
  active: boolean;
  dragging: boolean;
  pointerId: number;
  startX: number;
  startY: number;
  axis: GestureAxis;
  width: number;
  samples: Point[];
};

function dampedOffset(dx: number, index: number, count: number, width: number): number {
  const atStart = index === 0 && dx > 0;
  const atEnd = index === count - 1 && dx < 0;
  if (atStart || atEnd) return Math.max(-32, Math.min(32, dx * 0.3));
  return Math.max(-width, Math.min(width, dx));
}

export type PanelSwipeOptions = {
  index: number;
  count: number;
  onSwipe: (direction: SwipeDirection) => void;
  ignoreSelector?: string;
};

/**
 * Horizontal swipe between sibling panels (tabs keep working as the primary
 * control).
 *
 * Rules it follows:
 * - Axis lock: nothing moves until the gesture is clearly horizontal (see
 *   `decideAxis`), so vertical page scrolling is never cancelled.
 * - Gestures that start on links, buttons, fields, selects, rails or swipe
 *   cards are ignored.
 * - A drag never turns into a click on whatever sits under the finger.
 */
export function usePanelSwipe({
  index,
  count,
  onSwipe,
  ignoreSelector = PANEL_SWIPE_IGNORE,
}: PanelSwipeOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const suppressUntil = useRef(0);
  const state = useRef<SwipeState>({
    active: false,
    dragging: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    axis: "pending",
    width: 0,
    samples: [],
  });

  function releaseNode(keepOffset: boolean) {
    const node = containerRef.current;
    if (!node) return;
    node.classList.remove("is-dragging");
    node.style.removeProperty("transition");
    if (!keepOffset) node.style.setProperty("--panel-x", "0px");
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target as Element | null;
    if (target?.closest(ignoreSelector)) {
      state.current.active = false;
      return;
    }
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const swipe = state.current;
    swipe.active = true;
    swipe.dragging = false;
    swipe.pointerId = event.pointerId;
    swipe.startX = event.clientX;
    swipe.startY = event.clientY;
    swipe.axis = "pending";
    swipe.samples = [];
    swipe.width = containerRef.current?.clientWidth ?? 0;
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const swipe = state.current;
    if (!swipe.active || event.pointerId !== swipe.pointerId) return;
    const dx = event.clientX - swipe.startX;
    const dy = event.clientY - swipe.startY;

    if (swipe.axis === "pending") {
      swipe.axis = decideAxis(dx, dy);
      if (swipe.axis === "vertical") {
        swipe.active = false;
        return;
      }
      if (swipe.axis === "pending") return;
      swipe.dragging = true;
      const node = containerRef.current;
      if (node) {
        node.classList.add("is-dragging");
        node.style.transition = "none";
      }
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Capture is best effort; the gesture keeps working without it.
      }
    }

    if (!swipe.dragging) return;
    swipe.samples.push({ t: event.timeStamp, x: dx });
    if (swipe.samples.length > 6) swipe.samples.shift();
    containerRef.current?.style.setProperty(
      "--panel-x",
      `${dampedOffset(dx, index, count, swipe.width)}px`,
    );
  }

  function finishDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const swipe = state.current;
    if (!swipe.active) return;
    const dx = event.clientX - swipe.startX;
    const wasDragging = swipe.dragging;
    swipe.active = false;
    swipe.dragging = false;
    swipe.pointerId = -1;

    if (!wasDragging) return;

    const velocity = velocityFromSamples(swipe.samples);
    const threshold = Math.max(48, swipe.width * 0.18);
    const wantsForward = dx < -threshold || (velocity <= -0.5 && dx < -AXIS_START_PX);
    const wantsBackward = dx > threshold || (velocity >= 0.5 && dx > AXIS_START_PX);
    const target = wantsForward ? index + 1 : wantsBackward ? index - 1 : index;

    if (shouldCancelClick(dx)) {
      suppressUntil.current = event.timeStamp + 400;
      event.preventDefault();
    }

    if (target !== index && target >= 0 && target < count) {
      // The incoming panel owns the animation; the container snaps back at once.
      containerRef.current?.style.setProperty("--panel-x", "0px");
      onSwipe(target > index ? "forward" : "backward");
      requestAnimationFrame(() => releaseNode(true));
      return;
    }

    releaseNode(false);
  }

  function onPointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    const swipe = state.current;
    swipe.active = false;
    swipe.dragging = false;
    swipe.pointerId = -1;
    if (event.type === "pointercancel") releaseNode(false);
  }

  function onClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.timeStamp > suppressUntil.current) return;
    event.preventDefault();
    event.stopPropagation();
  }

  return {
    containerRef,
    containerProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishDrag,
      onPointerCancel,
      onClickCapture,
    },
  };
}
