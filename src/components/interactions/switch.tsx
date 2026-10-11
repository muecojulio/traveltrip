import { Check } from "lucide-react";
import { cx } from "@/lib/cx";

export type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Extra context announced together with the label. */
  description?: string;
  className?: string;
};

/**
 * Real switch semantics (`role="switch"` + `aria-checked`), animated with a
 * transform-only knob so the movement stays smooth, and a check mark inside the
 * knob so "on" never depends on colour alone.
 */
export function Switch({ checked, onChange, label, description, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx(
        "tap press lift flex min-h-12 w-full items-center justify-between gap-3 rounded-card border border-line bg-elev px-4 py-2 text-left",
        className,
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm text-ink">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-muted">{description}</span>
        ) : null}
      </span>
      <span
        aria-hidden="true"
        className={cx(
          "switch-track relative h-7 w-12 shrink-0 rounded-full border",
          checked ? "border-lagoon bg-lagoon-soft" : "border-line bg-line/60",
        )}
      >
        <span className="switch-knob absolute top-0.5 left-0.5 grid size-6 place-items-center rounded-full bg-knob shadow-sm">
          {checked ? <Check className="size-3.5 text-lagoon" strokeWidth={3} /> : null}
        </span>
      </span>
    </button>
  );
}
