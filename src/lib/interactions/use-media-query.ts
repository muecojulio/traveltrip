import { useSyncExternalStore } from "react";

/**
 * SSR-safe media query hook.
 *
 * The server snapshot is always `false`, which is also the first client render,
 * so hydration never mismatches: React re-renders right after hydration with
 * the real value of the device.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onStoreChange);
      return () => list.removeEventListener("change", onStoreChange);
    },
    () =>
      typeof window === "undefined" || !window.matchMedia
        ? false
        : window.matchMedia(query).matches,
    () => false,
  );
}

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
export const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

/** True when the user asked the system for less movement. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION_QUERY);
}

/**
 * True for mouse/trackpad users. Used to prefer plainly visible actions over
 * swipe-only affordances; it is never used to hide features from touch.
 */
export function useFinePointer(): boolean {
  return useMediaQuery(FINE_POINTER_QUERY);
}

/** Scroll behaviour that honours the reduced-motion preference. */
export function preferredScrollBehavior(reducedMotion: boolean): ScrollBehavior {
  return reducedMotion ? "auto" : "smooth";
}
