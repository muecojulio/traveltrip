import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Class name joiner used across the interaction primitives. */
export function cx(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
