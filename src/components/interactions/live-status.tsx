import { cx } from "@/lib/cx";

/** Text for screen readers only. */
export function LiveStatus({ message, className }: { message: string; className?: string }) {
  return (
    <p role="status" aria-live="polite" aria-atomic="true" className={cx("sr-only", className)}>
      {message}
    </p>
  );
}

export { LiveStatus as SrOnlyStatus };
