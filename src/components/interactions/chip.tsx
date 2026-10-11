import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";

export type ChipTone = "neutral" | "accent" | "good" | "warn";

const TONES: Record<ChipTone, string> = {
  neutral: "border-line bg-elev text-ink",
  accent: "border-lagoon bg-elev text-lagoon",
  good: "border-lagoon bg-lagoon-soft text-ink",
  warn: "border-warn/45 bg-elev text-warn",
};

/** Shared chip look: 44 px tall, native tap, hover lift for mouse users. */
function chipClass(tone: ChipTone = "neutral", extra?: string): string {
  return cx(
    "tap press lift inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm",
    TONES[tone],
    extra,
  );
}

export type LinkChipProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  tone?: ChipTone;
};

/** External comparison link rendered as a chip (never a gesture-only control). */
export function LinkChip({ children, tone = "neutral", className, ...rest }: LinkChipProps) {
  return (
    <a {...rest} rel="noreferrer" className={chipClass(tone, className)}>
      {children}
    </a>
  );
}
