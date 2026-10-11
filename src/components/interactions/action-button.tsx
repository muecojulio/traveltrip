import { Check, LoaderCircle, TriangleAlert } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import type { ActionState } from "@/lib/interactions/use-action-feedback";

export type ActionVariant = "primary" | "secondary" | "ghost" | "danger";
export type ActionSize = "md" | "lg" | "icon";

const VARIANTS: Record<ActionVariant, string> = {
  primary: "bg-clay text-clay-ink border border-transparent",
  secondary: "border border-line bg-elev text-ink",
  ghost: "border border-transparent bg-transparent text-lagoon",
  danger: "border border-warn/45 bg-elev text-warn",
};

/**
 * Every size clears the 44 × 44 px touch target before padding is applied.
 */
const SIZES: Record<ActionSize, string> = {
  md: "min-h-11 px-4 text-sm gap-2",
  lg: "min-h-12 px-5 text-base gap-2",
  icon: "size-11 shrink-0 p-0",
};

export type ActionButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "className"
> & {
  children?: ReactNode;
  /** Leading icon for the idle state. */
  icon?: ReactNode;
  /** Current action state: idle | loading | success | error. */
  state?: ActionState;
  /** Visible copy per state; idle falls back to `children`. */
  labels?: { idle?: ReactNode; loading: ReactNode; success: ReactNode; error: ReactNode };
  variant?: ActionVariant;
  size?: ActionSize;
  block?: boolean;
  /** Extra accessible hint, e.g. "Guardar viaje". */
  label?: string;
  className?: string;
};

function StateIcon({ state }: { state: ActionState }) {
  if (state === "loading") {
    return <LoaderCircle aria-hidden className="spin size-4" />;
  }
  if (state === "success") {
    return <Check aria-hidden className="size-4" />;
  }
  if (state === "error") {
    return <TriangleAlert aria-hidden className="size-4" />;
  }
  return null;
}

/**
 * Button with the four states the product needs (idle, loading, success,
 * error), a short press micro-interaction, hover elevation for mouse users and
 * a distinguishable disabled state.
 *
 * While loading it disables itself so a second tap cannot duplicate the
 * request, and it publishes `aria-busy` plus `data-state` (used by CSS for the
 * success flash and the discreet error nudge).
 */
export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(function ActionButton(
  {
    children,
    icon,
    state = "idle",
    labels,
    variant = "secondary",
    size = "md",
    block = false,
    label,
    className,
    disabled,
    type = "button",
    ...rest
  },
  ref,
) {
  const loading = state === "loading";
  const content =
    state !== "idle" && labels ? (
      <>
        <StateIcon state={state} />
        {labels[state]}
      </>
    ) : (
      <>
        {icon}
        {children}
      </>
    );

  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      data-state={state}
      aria-busy={loading || undefined}
      aria-label={label}
      disabled={disabled || loading}
      className={cx(
        "action tap press lift inline-flex items-center justify-center rounded-full font-medium",
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        block && size !== "icon" && "rounded-card",
        className,
      )}
    >
      {content}
    </button>
  );
});
