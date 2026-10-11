/**
 * Pure gesture math shared by every swipe surface in the app.
 *
 * Kept free of DOM access so the decisions below are unit-testable: the
 * components only feed pointer samples in and apply the answer.
 */

export type GestureAxis = "pending" | "horizontal" | "vertical";

/** Ignore micro-movements: below this, we do not know yet which way the finger goes. */
export const AXIS_START_PX = 10;

/** A gesture is horizontal only when |dx| clearly beats |dy| (spec: ~1.2). */
export const HORIZONTAL_RATIO = 1.2;

/**
 * Decides once (and then keeps the answer) whether a drag is horizontal or
 * vertical. Vertical drags always belong to the browser: we never fight them.
 */
export function decideAxis(
  dx: number,
  dy: number,
  startPx: number = AXIS_START_PX,
  ratio: number = HORIZONTAL_RATIO,
): GestureAxis {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < startPx && ay < startPx) return "pending";
  return ax >= ay * ratio ? "horizontal" : "vertical";
}

/** Resistance applied when dragging a surface past its natural travel. */
export const OVERSCROLL_RESISTANCE = 0.35;
export const MAX_OVERSCROLL_PX = 28;

/**
 * Position of a reveal surface while dragging.
 *
 * `dx` is the horizontal pointer delta (positive = to the right), `width` is
 * the width of the actions panel, `open` the state the drag started from.
 * Result is always <= 0 (never exposes more than the panel) and stays inside a
 * small, damped overscroll so the gesture feels anchored.
 */
export function revealOffset(
  dx: number,
  options: { open: boolean; width: number; resistance?: number; maxOverscroll?: number },
): number {
  const { open, width } = options;
  const resistance = options.resistance ?? OVERSCROLL_RESISTANCE;
  const maxOverscroll = options.maxOverscroll ?? MAX_OVERSCROLL_PX;
  if (width <= 0) return 0;
  const base = open ? -width : 0;
  const next = base + dx;
  if (next > 0) return Math.min(next * resistance, maxOverscroll);
  if (next < -width)
    return Math.max(-width - (Math.abs(next) - width) * resistance, -width - maxOverscroll);
  return next;
}

export type RevealDecisionInput = {
  /** Where the surface sits when the finger lifts (<= 0). */
  offset: number;
  /** px / ms; negative = flicking left (revealing), positive = flicking right. */
  velocity: number;
  /** Width of the actions panel. */
  width: number;
  /** Whether the panel was open when the drag started. */
  open: boolean;
  /** Fraction of the panel that must be covered to open / uncovered to close. */
  ratio?: number;
  /** Minimum flick speed to open / close without covering the ratio. */
  flickVelocity?: number;
  /** Minimum travel for a flick to count (guards against jitter). */
  flickDistance?: number;
};

/** Fraction of the panel currently revealed (0 = closed, 1 = fully open). */
export function revealRatio(offset: number, width: number): number {
  if (width <= 0) return 0;
  const travelled = Math.min(0, Math.max(offset, -width));
  return Math.abs(travelled) / width;
}

/** Should the panel stay open after this drag? */
export function resolveReveal(input: RevealDecisionInput): boolean {
  const {
    offset,
    velocity,
    width,
    open,
    ratio = 0.45,
    flickVelocity = 0.5,
    flickDistance = 14,
  } = input;
  if (width <= 0) return open;
  const moved = revealRatio(offset, width) * width;
  if (velocity <= -flickVelocity && moved >= flickDistance) return true;
  if (velocity >= flickVelocity && width - moved >= flickDistance) return false;
  const covered = revealRatio(offset, width);
  if (!open && covered > ratio) return true;
  if (open && covered < 1 - ratio) return false;
  return open;
}

/** A drag longer than this must not turn into a click on the surface below. */
export const CLICK_CANCEL_PX = 8;

export function shouldCancelClick(travel: number): boolean {
  return Math.abs(travel) > CLICK_CANCEL_PX;
}

/** Simple trailing velocity tracker (px / ms) fed with pointer samples. */
export function velocityFromSamples(samples: { t: number; x: number }[]): number {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  const first = samples[0];
  const dt = last.t - first.t;
  if (dt <= 0) return 0;
  return (last.x - first.x) / dt;
}
