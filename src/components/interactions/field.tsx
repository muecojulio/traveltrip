import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { fieldErrorId, fieldHintId } from "@/lib/interactions/dom-ids";

export type FieldProps = {
  /** Visible label; never rely on the placeholder as the only name. */
  label: string;
  htmlFor: string;
  /** Small helper text, linked through `aria-describedby`. */
  hint?: string;
  /** Error copy; rendered as an alert and linked through the same id helpers. */
  error?: string | null;
  children: ReactNode;
  className?: string;
};

/** Label + control + hint + error, with stable ids callers can point at. */
export function Field({ label, htmlFor, hint, error, children, className }: FieldProps) {
  return (
    <div className={cx("block text-sm", className)}>
      <label htmlFor={htmlFor} className="mb-1 block text-sm text-muted">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={fieldHintId(htmlFor)} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={fieldErrorId(htmlFor)} role="alert" className="mt-1 text-xs text-warn">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Inputs and selects share the focus halo and the 44 px minimum height. */
export const controlClass =
  "field-control min-h-12 w-full rounded-xl border border-line bg-elev px-3 text-ink outline-none";
