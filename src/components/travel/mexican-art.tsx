import type { DestinationScenery } from "@/lib/travel/catalog";

/**
 * Decorative Papel Picado border strip inspired by Mexican folk art.
 */
export function PapelPicadoStrip() {
  return (
    <div
      aria-hidden="true"
      className="flex h-2.5 w-full overflow-hidden opacity-90"
    >
      <div className="h-full flex-1 bg-clay" />
      <div className="h-full flex-1 bg-marigold" />
      <div className="h-full flex-1 bg-lagoon" />
      <div className="h-full flex-1 bg-fiesta" />
      <div className="h-full flex-1 bg-jade" />
      <div className="h-full flex-1 bg-clay" />
      <div className="h-full flex-1 bg-marigold" />
      <div className="h-full flex-1 bg-lagoon" />
    </div>
  );
}

/**
 * Illustrated Mexican coastal & cultural panorama with animated flight arc.
 */
export function HeroPanoramaSvg({
  originIata,
  destinationCode,
  flightMode,
}: {
  originIata: string;
  destinationCode: string;
  flightMode: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line/80 bg-gradient-to-br from-lagoon-soft via-elev to-clay/15 p-3 shadow-inner">
      <svg
        viewBox="0 0 560 135"
        role="img"
        aria-label="Ilustración panorámica de viaje por México"
        className="h-28 w-full sm:h-32"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--lagoon)" stopOpacity="0.22" />
            <stop offset="55%" stopColor="var(--marigold)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--clay)" stopOpacity="0.28" />
          </linearGradient>
          <linearGradient id="seaGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--lagoon)" stopOpacity="0.55" />
            <stop offset="50%" stopColor="var(--jade)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--lagoon)" stopOpacity="0.65" />
          </linearGradient>
          <linearGradient id="sunGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--marigold)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--clay)" stopOpacity="0.85" />
          </linearGradient>
        </defs>

        <rect width="560" height="135" rx="14" fill="url(#skyGrad)" />

        {/* Decorative sun / moon */}
        <circle cx="465" cy="42" r="26" fill="url(#sunGrad)" className="pulse-slow" />
        <circle
          cx="465"
          cy="42"
          r="34"
          fill="none"
          stroke="var(--marigold)"
          strokeOpacity="0.35"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Floating clouds */}
        <g className="float-cloud" opacity="0.55" fill="var(--ink)">
          <rect x="62" y="24" width="46" height="10" rx="5" opacity="0.18" />
          <rect x="330" y="18" width="56" height="11" rx="5.5" opacity="0.16" />
        </g>

        {/* Distant Sierra & Volcanoes */}
        <path
          d="M0 105 L65 68 L125 98 L195 56 L265 98 L345 72 L420 100 L505 64 L560 95 L560 135 L0 135 Z"
          fill="var(--lagoon)"
          fillOpacity="0.18"
        />

        {/* Mayan Pyramid silhouette (left-center) */}
        <g fill="var(--clay)" fillOpacity="0.42">
          <rect x="82" y="88" width="52" height="8" rx="1" />
          <rect x="90" y="80" width="36" height="8" rx="1" />
          <rect x="98" y="72" width="20" height="8" rx="1" />
          <rect x="103" y="65" width="10" height="7" rx="1" />
        </g>

        {/* Colonial Dome & Arch silhouette (center-right) */}
        <g fill="var(--marigold)" fillOpacity="0.38">
          <path d="M362 96 V78 A14 14 0 0 1 390 78 V96 Z" />
          <rect x="355" y="84" width="6" height="14" rx="1" />
          <rect x="391" y="84" width="6" height="14" rx="1" />
        </g>

        {/* Palm trees silhouette (right coast) */}
        <g stroke="var(--lagoon)" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.75">
          <path d="M506 105 Q510 85 502 70" />
          <path d="M502 70 Q490 66 485 74" />
          <path d="M502 70 Q500 58 512 60" />
          <path d="M502 70 Q515 66 520 75" />
        </g>

        {/* Flight or Road Route Arc */}
        <path
          d="M 58 92 Q 275 10 482 86"
          fill="none"
          stroke="var(--clay)"
          strokeWidth="2.2"
          strokeDasharray="6 5"
          opacity="0.85"
        />

        {/* Origin & Destination Pins */}
        <g>
          <circle cx="58" cy="92" r="5" fill="var(--lagoon)" />
          <circle cx="58" cy="92" r="9" fill="none" stroke="var(--lagoon)" strokeOpacity="0.45" strokeWidth="1.5" />
          <circle cx="482" cy="86" r="5.5" fill="var(--clay)" />
          <circle cx="482" cy="86" r="10" fill="none" stroke="var(--clay)" strokeOpacity="0.5" strokeWidth="1.5" />
        </g>

        {/* Airplane or Road badge along the arc */}
        {flightMode ? (
          <g transform="translate(262, 36) rotate(4)" className="float-plane">
            <circle cx="14" cy="14" r="14" fill="var(--bg-elev)" stroke="var(--clay)" strokeWidth="1.5" />
            <path
              d="M8 15 L20 11 L17 19 L14 16 L11 18 Z"
              fill="var(--clay)"
            />
          </g>
        ) : (
          <g transform="translate(262, 36)">
            <circle cx="14" cy="14" r="14" fill="var(--bg-elev)" stroke="var(--lagoon)" strokeWidth="1.5" />
            <rect x="8" y="12" width="12" height="6" rx="2" fill="var(--lagoon)" />
            <circle cx="10.5" cy="19" r="1.8" fill="var(--clay)" />
            <circle cx="17.5" cy="19" r="1.8" fill="var(--clay)" />
          </g>
        )}

        {/* Layered Caribbean & Pacific waves */}
        <path
          d="M0 104 Q70 94 140 104 T280 104 T420 104 T560 104 L560 135 L0 135 Z"
          fill="url(#seaGrad)"
        />
        <path
          d="M0 116 Q70 108 140 116 T280 116 T420 116 T560 116 L560 135 L0 135 Z"
          fill="var(--lagoon)"
          fillOpacity="0.38"
        />
      </svg>

      {/* Route overlay pills */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-elev/90 px-2.5 py-1 font-medium text-ink">
          <span className="size-2 rounded-full bg-lagoon" />
          {flightMode ? `Origen: ${originIata}` : "Ruta terrestre"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-clay/40 bg-clay/15 px-2.5 py-1 font-medium text-ink">
          {flightMode ? "✈ Vuelo redondo + Hotel" : "🚗 Escapada solo Hotel"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-elev/90 px-2.5 py-1 font-medium text-ink">
          <span className="size-2 rounded-full bg-clay" />
          Destino: {destinationCode}
        </span>
      </div>
    </div>
  );
}

/**
 * Miniature landscape illustration for each destination card according to its scenery.
 */
export function DestinationSceneryArt({
  scenery,
  selected,
}: {
  scenery: DestinationScenery;
  selected: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className="relative mb-2.5 h-14 w-full overflow-hidden rounded-xl border border-line/60"
    >
      <svg
        viewBox="0 0 180 60"
        className="h-full w-full"
        preserveAspectRatio="xMidYMid slice"
      >
        {scenery === "caribe" && (
          <>
            <rect width="180" height="60" fill="var(--lagoon)" fillOpacity="0.22" />
            <circle cx="145" cy="18" r="11" fill="var(--marigold)" fillOpacity="0.85" />
            <path d="M0 40 Q45 32 90 40 T180 40 L180 60 L0 60 Z" fill="var(--lagoon)" fillOpacity="0.55" />
            <path d="M0 49 Q45 43 90 49 T180 49 L180 60 L0 60 Z" fill="var(--jade)" fillOpacity="0.45" />
            <path d="M34 45 Q38 28 30 16" stroke="var(--lagoon)" strokeWidth="2.5" fill="none" />
            <path d="M30 16 Q20 14 16 20 M30 16 Q38 10 44 16 M30 16 Q26 8 34 8" stroke="var(--jade)" strokeWidth="2" fill="none" />
          </>
        )}
        {scenery === "pacifico" && (
          <>
            <rect width="180" height="60" fill="var(--clay)" fillOpacity="0.24" />
            <circle cx="95" cy="34" r="16" fill="var(--marigold)" fillOpacity="0.8" />
            <path d="M0 42 L42 22 L76 42 Z" fill="var(--clay)" fillOpacity="0.5" />
            <path d="M0 42 Q45 36 90 42 T180 42 L180 60 L0 60 Z" fill="var(--lagoon)" fillOpacity="0.6" />
          </>
        )}
        {scenery === "colonial" && (
          <>
            <rect width="180" height="60" fill="var(--marigold)" fillOpacity="0.18" />
            <circle cx="32" cy="18" r="9" fill="var(--clay)" fillOpacity="0.7" />
            <path d="M68 52 V32 A18 18 0 0 1 104 32 V52 Z" fill="var(--clay)" fillOpacity="0.55" />
            <rect x="56" y="24" width="8" height="28" rx="2" fill="var(--lagoon)" fillOpacity="0.5" />
            <rect x="108" y="24" width="8" height="28" rx="2" fill="var(--lagoon)" fillOpacity="0.5" />
            <rect x="0" y="50" width="180" height="10" fill="var(--clay)" fillOpacity="0.3" />
          </>
        )}
        {scenery === "desierto" && (
          <>
            <rect width="180" height="60" fill="var(--marigold)" fillOpacity="0.22" />
            <circle cx="142" cy="18" r="12" fill="var(--clay)" fillOpacity="0.8" />
            <path d="M0 46 Q55 28 115 44 T180 40 L180 60 L0 60 Z" fill="var(--clay)" fillOpacity="0.42" />
            {/* Cactus silhouette */}
            <path
              d="M42 48 V22 M34 32 H42 M34 32 V25 M50 35 H42 M50 35 V27"
              stroke="var(--jade)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </>
        )}
        {scenery === "selva" && (
          <>
            <rect width="180" height="60" fill="var(--jade)" fillOpacity="0.2" />
            <circle cx="146" cy="18" r="10" fill="var(--marigold)" fillOpacity="0.8" />
            {/* Pyramid & lush hills */}
            <path d="M0 48 Q50 24 105 46 T180 38 L180 60 L0 60 Z" fill="var(--lagoon)" fillOpacity="0.45" />
            <polygon points="55,46 78,22 101,46" fill="var(--clay)" fillOpacity="0.55" />
          </>
        )}
        {scenery === "metropoli" && (
          <>
            <rect width="180" height="60" fill="var(--fiesta)" fillOpacity="0.16" />
            <path d="M0 48 L48 20 L95 44 L145 18 L180 42 L180 60 L0 60 Z" fill="var(--lagoon)" fillOpacity="0.32" />
            <rect x="42" y="28" width="12" height="24" rx="1.5" fill="var(--ink)" fillOpacity="0.3" />
            <rect x="58" y="22" width="14" height="30" rx="1.5" fill="var(--clay)" fillOpacity="0.55" />
            <rect x="76" y="32" width="12" height="20" rx="1.5" fill="var(--lagoon)" fillOpacity="0.55" />
            <rect x="0" y="50" width="180" height="10" fill="var(--lagoon)" fillOpacity="0.35" />
          </>
        )}
      </svg>
      {selected ? (
        <span className="absolute bottom-1.5 left-2 rounded-full bg-clay px-2 py-0.5 text-[10px] font-semibold tracking-wide text-clay-ink uppercase shadow-sm">
          Seleccionado
        </span>
      ) : null}
    </div>
  );
}

/**
 * Illustrated weather condition icon for daily forecast cards.
 */
export function WeatherIllustration({ label }: { label: string }) {
  const lower = label.toLowerCase();
  const isStorm = lower.includes("tormenta");
  const isRain = lower.includes("lluv") || lower.includes("chubasco");
  const isCloud = lower.includes("nublado") || lower.includes("niebla") || lower.includes("variable");

  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className="size-9 shrink-0"
    >
      {isStorm ? (
        <>
          <path
            d="M11 26 H29 A6 6 0 0 0 29 14 A8 8 0 0 0 14 12 A6 6 0 0 0 11 26 Z"
            fill="var(--lagoon)"
            fillOpacity="0.7"
          />
          <polygon points="21,24 16,32 21,32 19,38 26,29 21,29" fill="var(--marigold)" />
        </>
      ) : isRain ? (
        <>
          <path
            d="M11 25 H29 A6 6 0 0 0 29 13 A8 8 0 0 0 14 11 A6 6 0 0 0 11 25 Z"
            fill="var(--lagoon)"
            fillOpacity="0.75"
          />
          <line x1="15" y1="28" x2="13" y2="34" stroke="var(--lagoon)" strokeWidth="2" strokeLinecap="round" />
          <line x1="21" y1="28" x2="19" y2="34" stroke="var(--lagoon)" strokeWidth="2" strokeLinecap="round" />
          <line x1="27" y1="28" x2="25" y2="34" stroke="var(--lagoon)" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : isCloud ? (
        <>
          <circle cx="15" cy="15" r="7" fill="var(--marigold)" />
          <path
            d="M13 28 H30 A5.5 5.5 0 0 0 30 17 A7 7 0 0 0 17 15 A5.5 5.5 0 0 0 13 28 Z"
            fill="var(--lagoon)"
            fillOpacity="0.65"
          />
        </>
      ) : (
        <>
          <circle cx="20" cy="20" r="9" fill="var(--marigold)" />
          <circle
            cx="20"
            cy="20"
            r="13"
            fill="none"
            stroke="var(--clay)"
            strokeWidth="2"
            strokeDasharray="3 4"
          />
        </>
      )}
    </svg>
  );
}
