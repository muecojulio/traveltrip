import { ExternalLink } from "lucide-react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { safeExternalHref } from "@/lib/travel/security";

type ChipTone = "neutral" | "accent" | "good" | "warn";

const TONES: Record<ChipTone, string> = {
  neutral: "border-line bg-elev text-ink hover:border-lagoon/50",
  accent: "border-lagoon bg-lagoon-soft text-lagoon",
  good: "border-lagoon bg-lagoon-soft text-ink",
  warn: "border-warn/45 bg-elev text-warn",
};

/** Shared chip look: 44 px tall, native tap, hover lift for mouse users. */
function chipClass(tone: ChipTone = "neutral", extra?: string): string {
  return cx(
    "tap press lift inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-colors",
    TONES[tone],
    extra,
  );
}

type LinkChipProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  tone?: ChipTone;
};

/** External comparison link rendered as a chip with URL validation and anti-tabnabbing attributes. */
export function LinkChip({
  children,
  tone = "neutral",
  className,
  href,
  ...rest
}: LinkChipProps) {
  const safeHref = safeExternalHref(href);
  if (!safeHref) return null;
  const isExternal = safeHref.startsWith("https://");
  return (
    <a
      {...rest}
      href={safeHref}
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
      className={chipClass(tone, className)}
    >
      <span>{children}</span>
      {isExternal ? (
        <ExternalLink aria-hidden="true" className="size-3 shrink-0 opacity-70" />
      ) : null}
    </a>
  );
}
