import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Check,
  Clock3,
  Compass,
  Luggage,
  MapPin,
  Minus,
  Plane,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
} from "lucide-react";
import { useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { cx } from "@/lib/cx";
import {
  DESTINATION_REGIONS,
  DESTINATIONS,
  ORIGINS,
  QUICK_ESCAPES,
  type DestinationRegion,
  type DestinationScenery,
  type QuickEscape,
} from "@/lib/travel/catalog";
import { ActionButton } from "@/components/interactions/action-button";
import { Field, controlClass } from "@/components/interactions/field";
import { ScrollRail } from "@/components/interactions/scroll-rail";
import { SearchCombobox, type ComboOption } from "@/components/interactions/search-combobox";
import { Switch } from "@/components/interactions/switch";
import { fieldErrorId, fieldHintId } from "@/lib/interactions/dom-ids";
import type { ActionState } from "@/lib/interactions/use-action-feedback";
import { DestinationSceneryArt } from "./mexican-art";
import { addIsoDays, mexicoDate, nightsBetween, type SearchParams } from "./travel-model";

const ORIGIN_OPTIONS: ComboOption[] = ORIGINS.map((origin) => ({
  value: origin.iata,
  label: `${origin.city} · ${origin.airport}`,
  description: `Aeropuerto ${origin.iata}`,
  keywords: [origin.iata, origin.city, origin.airport],
}));

type DestinationOption = {
  id: string;
  city: string;
  state: string;
  blurb: string;
  groundOnly: boolean | null;
  region: DestinationRegion | "custom";
  scenery: DestinationScenery;
  avgTempC: number | null;
  highlights: string[];
  iata: string | null;
};

const DESTINATION_OPTIONS: DestinationOption[] = [
  ...DESTINATIONS.map((destination) => ({
    id: destination.id,
    city: destination.city,
    state: destination.state,
    blurb: destination.blurb,
    groundOnly: destination.groundOnly,
    region: destination.region,
    scenery: destination.scenery,
    avgTempC: destination.avgTempC,
    highlights: destination.highlights,
    iata: destination.iata,
  })),
  {
    id: "custom",
    city: "Otra ciudad",
    state: "México",
    blurb: "Busca cualquier ciudad mexicana",
    groundOnly: null,
    region: "custom",
    scenery: "colonial",
    avgTempC: null,
    highlights: ["Geocodificación abierta", "Aeropuerto más cercano", "Clima local"],
    iata: null,
  },
];

type SearchPanelProps = {
  params: SearchParams;
  onChange: (patch: Partial<SearchParams>) => void;
  onSearch: () => void;
  flightLikely: boolean;
  searchReady: boolean;
  error: string;
  searchState: ActionState;
};

export function SearchPanel({
  params,
  onChange,
  onSearch,
  flightLikely,
  searchReady,
  error,
  searchState,
}: SearchPanelProps) {
  const [regionFilter, setRegionFilter] = useState<"todos" | DestinationRegion>("todos");
  const cards = useRef(new Map<string, HTMLButtonElement | null>());

  const datesInvalid = Boolean(
    params.checkIn && params.checkOut && params.checkOut <= params.checkIn,
  );
  const cityInvalid = params.destinationId === "custom" && params.customCity.trim().length < 3;

  const visibleDestinations = useMemo(() => {
    if (regionFilter === "todos") return DESTINATION_OPTIONS;
    return DESTINATION_OPTIONS.filter(
      (item) =>
        item.region === regionFilter ||
        item.id === "custom" ||
        item.id === params.destinationId,
    );
  }, [params.destinationId, regionFilter]);

  const activeDestination = useMemo(
    () =>
      DESTINATION_OPTIONS.find((item) => item.id === params.destinationId) ??
      DESTINATION_OPTIONS[0],
    [params.destinationId],
  );

  const selectedNights = useMemo(() => {
    if (!params.checkIn || !params.checkOut || datesInvalid) return 0;
    return Math.max(0, nightsBetween(params.checkIn, params.checkOut));
  }, [datesInvalid, params.checkIn, params.checkOut]);

  function applyQuickEscape(escape: QuickEscape) {
    const start = mexicoDate(14);
    const end = addIsoDays(start, escape.nights);
    setRegionFilter("todos");
    onChange({
      destinationId: escape.destinationId,
      customCity: "",
      checkIn: start,
      checkOut: end,
    });
  }

  function moveSelection(event: ReactKeyboardEvent<HTMLButtonElement>, index: number) {
    const last = visibleDestinations.length - 1;
    let next = -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown")
      next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    else return;
    event.preventDefault();
    const target = visibleDestinations[next];
    if (!target) return;
    onChange({ destinationId: target.id });
    cards.current.get(target.id)?.focus();
  }

  return (
    <section className="space-y-5">
      {/* Quick Escape Inspiration Rail */}
      <div className="rounded-card border border-line bg-elev/85 p-3.5 card-shadow">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-full bg-clay/15 text-clay">
              <Sparkles aria-hidden="true" className="size-4" />
            </span>
            <div>
              <h2 className="font-display text-base leading-tight text-ink">
                Escapadas con chispa
              </h2>
              <p className="text-xs text-muted">
                Toca una idea para cargar destino y noches recomendadas
              </p>
            </div>
          </div>
          <span className="rounded-full bg-lagoon-soft px-2.5 py-0.5 text-[11px] font-medium text-lagoon">
            1 clic
          </span>
        </div>

        <ScrollRail
          label="Escapadas rápidas sugeridas"
          itemSnap="start"
          snap="proximity"
          gapClassName="gap-2.5"
        >
          {QUICK_ESCAPES.map((escape) => {
            const isCurrent = params.destinationId === escape.destinationId;
            return (
              <button
                key={escape.id}
                type="button"
                onClick={() => applyQuickEscape(escape)}
                className={cx(
                  "tap press lift min-w-56 shrink-0 rounded-xl border p-3 text-left transition-colors",
                  isCurrent
                    ? "border-clay bg-clay/12 ring-1 ring-clay"
                    : "border-line bg-bg/70 hover:border-lagoon/60",
                )}
              >
                <span className="inline-block rounded-full bg-marigold/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-ink uppercase">
                  {escape.badge}
                </span>
                <span className="mt-1.5 block font-display text-sm leading-snug text-ink">
                  {escape.title}
                </span>
                <span className="mt-0.5 block text-xs text-muted">{escape.subtitle}</span>
              </button>
            );
          })}
        </ScrollRail>
      </div>

      {/* Destination Explorer with Region Tabs & Rich Illustrated Cards */}
      <div className="rounded-card border border-line bg-elev p-4 card-shadow">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Compass aria-hidden="true" className="size-4 text-lagoon" />
            <p className="font-display text-lg text-ink">Elige tu destino en México</p>
          </div>
          <span className="text-xs text-muted">
            {visibleDestinations.length} destinos listos
          </span>
        </div>

        {/* Region Filter Pills */}
        <div
          role="group"
          aria-label="Filtrar destinos por región"
          className="mb-3 flex flex-wrap gap-1.5"
        >
          {DESTINATION_REGIONS.map((region) => {
            const active = regionFilter === region.id;
            return (
              <button
                key={region.id}
                type="button"
                aria-pressed={active}
                onClick={() => setRegionFilter(region.id)}
                className={cx(
                  "tap press min-h-9 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-lagoon bg-lagoon text-knob"
                    : "border-line bg-bg/70 text-muted hover:text-ink",
                )}
              >
                {region.label}
              </button>
            );
          })}
        </div>

        <ScrollRail
          label="Destino"
          role="radiogroup"
          focusable={false}
          itemSnap="center"
          snap="proximity"
          activeValue={params.destinationId}
          gridClassName="sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:max-h-96 sm:overflow-y-auto"
          hintLabel="Desliza"
        >
          {visibleDestinations.map((option, index) => {
            const selected = option.id === params.destinationId;
            return (
              <button
                key={option.id}
                ref={(node) => {
                  cards.current.set(option.id, node);
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                data-rail-value={option.id}
                onClick={() => onChange({ destinationId: option.id })}
                onKeyDown={(event) => moveSelection(event, index)}
                className={cx(
                  "tap press lift relative min-w-44 shrink-0 rounded-card border p-3 text-left sm:min-w-0",
                  selected
                    ? "border-clay bg-clay/8 ring-1 ring-clay"
                    : "border-line bg-bg/55 hover:border-lagoon/50",
                )}
              >
                <DestinationSceneryArt scenery={option.scenery} selected={selected} />

                {selected ? (
                  <span className="absolute top-4 right-4 grid size-5 place-items-center rounded-full bg-clay text-clay-ink shadow-sm">
                    <Check aria-hidden="true" className="size-3" strokeWidth={3} />
                  </span>
                ) : null}

                <div className="flex items-baseline justify-between gap-1">
                  <span className="block font-display text-lg leading-tight text-ink">
                    {option.city}
                  </span>
                  {option.avgTempC !== null ? (
                    <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-marigold">
                      <Sun aria-hidden="true" className="size-3" />
                      {option.avgTempC}°C
                    </span>
                  ) : null}
                </div>

                <span className="mt-0.5 block text-xs text-muted">
                  {option.state} · {option.blurb}
                </span>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-1">
                  <span
                    className={cx(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      selected
                        ? "bg-clay text-clay-ink"
                        : option.groundOnly
                          ? "bg-lagoon-soft text-lagoon"
                          : "bg-lagoon-soft/80 text-ink",
                    )}
                  >
                    {option.groundOnly === null
                      ? "Ciudad libre"
                      : option.groundOnly
                        ? "🚗 Sin vuelo"
                        : `✈ Con vuelo${option.iata ? ` · ${option.iata}` : ""}`}
                  </span>
                </div>
              </button>
            );
          })}
        </ScrollRail>

        {/* Active Destination Spotlight */}
        {activeDestination ? (
          <div className="mt-3.5 rounded-xl border border-line/80 bg-lagoon-soft/45 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MapPin aria-hidden="true" className="size-4 text-clay" />
                <span className="text-xs font-semibold tracking-wide text-ink uppercase">
                  {activeDestination.city} ({activeDestination.state})
                </span>
              </div>
              {activeDestination.avgTempC !== null ? (
                <span className="text-xs text-muted">
                  Clima típico ~{activeDestination.avgTempC}°C
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {activeDestination.highlights.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-line bg-elev px-2.5 py-0.5 text-xs text-ink"
                >
                  ✦ {tag}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {params.destinationId === "custom" ? (
        <div className="rounded-card border border-clay/60 bg-elev p-4 card-shadow">
          <Field
            label="Nombre de la ciudad en México"
            htmlFor="search-city"
            hint="Escribe al menos tres letras (ej. Guanajuato, San Cristóbal, Bacalar)."
          >
            <input
              id="search-city"
              value={params.customCity}
              onChange={(event) => onChange({ customCity: event.target.value })}
              placeholder="Por ejemplo, Guanajuato"
              aria-invalid={cityInvalid}
              aria-describedby={fieldHintId("search-city")}
              className={controlClass}
            />
          </Field>
        </div>
      ) : null}

      {/* Flight Origin, Dates & Travelers Card */}
      <div className="space-y-4 rounded-card border border-line bg-elev p-4 card-shadow">
        {flightLikely ? (
          <SearchCombobox
            id="search-origin"
            label="Sales desde el aeropuerto de"
            options={ORIGIN_OPTIONS}
            value={params.originIata}
            onChange={(value) => onChange({ originIata: value })}
            hint="Busca por ciudad, aeropuerto o código IATA de tres letras."
          />
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-lagoon/40 bg-lagoon-soft px-3.5 py-3 text-sm text-ink">
            <Plane aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-lagoon" />
            <div>
              <p className="font-medium">Escapada terrestre sin vuelo</p>
              <p className="text-xs text-muted">
                Cuernavaca, Veracruz y Acapulco se cotizan únicamente con estancia de hotel.
              </p>
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
              <CalendarDays aria-hidden="true" className="size-3.5 text-lagoon" />
              Fechas de estancia
            </span>
            {selectedNights > 0 ? (
              <span className="rounded-full bg-clay/15 px-2.5 py-0.5 text-xs font-semibold text-clay">
                {selectedNights} {selectedNights === 1 ? "noche" : "noches"}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Llegada (Check-in)" htmlFor="search-checkin">
              <input
                id="search-checkin"
                type="date"
                value={params.checkIn}
                min={mexicoDate(0)}
                aria-invalid={datesInvalid}
                aria-describedby={datesInvalid ? fieldErrorId("search-checkout") : undefined}
                onChange={(event) => {
                  const next = event.target.value;
                  const patch: Partial<SearchParams> = { checkIn: next };
                  if (next && params.checkOut <= next) patch.checkOut = addIsoDays(next, 1);
                  onChange(patch);
                }}
                className={controlClass}
              />
            </Field>
            <Field
              label="Salida (Check-out)"
              htmlFor="search-checkout"
              error={datesInvalid ? "La salida debe ser después de la llegada." : null}
            >
              <input
                id="search-checkout"
                type="date"
                value={params.checkOut}
                min={params.checkIn ? addIsoDays(params.checkIn, 1) : mexicoDate(1)}
                aria-invalid={datesInvalid}
                aria-describedby={datesInvalid ? fieldErrorId("search-checkout") : undefined}
                onChange={(event) => onChange({ checkOut: event.target.value })}
                className={controlClass}
              />
            </Field>
          </div>
        </div>

        <div className="flex min-h-13 items-center justify-between rounded-xl border border-line bg-bg/60 px-4 py-2">
          <div className="flex items-center gap-2.5">
            <Users aria-hidden="true" className="size-4 text-lagoon" />
            <div>
              <label htmlFor="search-adults" className="block text-sm font-medium text-ink">
                Viajeros adultos
              </label>
              <span className="text-xs text-muted">Habitación compartida y vuelo redondo</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ActionButton
              size="icon"
              variant="secondary"
              label="Menos adultos"
              disabled={params.adults <= 1}
              onClick={() => onChange({ adults: Math.max(1, params.adults - 1) })}
              className="rounded-full"
            >
              <Minus aria-hidden="true" className="size-4" />
            </ActionButton>
            <output
              id="search-adults"
              aria-label="Adultos"
              className="w-7 text-center font-display text-lg font-semibold tabular-nums"
            >
              {params.adults}
            </output>
            <ActionButton
              size="icon"
              variant="secondary"
              label="Más adultos"
              disabled={params.adults >= 6}
              onClick={() => onChange({ adults: Math.min(6, params.adults + 1) })}
              className="rounded-full"
            >
              <Plus aria-hidden="true" className="size-4" />
            </ActionButton>
          </div>
        </div>
      </div>

      {/* Smart Flight Rules */}
      <div
        role="group"
        aria-label="Filtros inteligentes de vuelo"
        className="space-y-2.5 rounded-card border border-line bg-elev p-4 card-shadow"
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-lagoon uppercase">
            <Luggage aria-hidden="true" className="size-3.5" />
            Reglas de comodidad
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <Clock3 aria-hidden="true" className="size-3.5" />
            Aprovecha el día 1
          </span>
        </div>
        <Switch
          checked={params.cabinOnly}
          onChange={(value) => onChange({ cabinOnly: value })}
          label="Solo tarifas con maleta de mano"
          description="Descarta tarifas básicas que solo incluyen artículo personal."
        />
        <Switch
          checked={params.arriveBy14}
          onChange={(value) => onChange({ arriveBy14: value })}
          label="Llegar a más tardar a las 2 pm"
          description="Filtra vuelos que aterrizan el mismo día antes de las 14:00 hrs."
        />
      </div>

      {cityInvalid ? (
        <p className="text-sm text-muted">Escribe el nombre de la ciudad para consultar.</p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-warn/50 bg-warn/10 px-4 py-3 text-sm text-warn"
        >
          {error}
        </p>
      ) : null}

      <ActionButton
        variant="primary"
        size="lg"
        block
        state={searchState}
        icon={<Search aria-hidden="true" className="size-4" />}
        labels={{
          loading: "Buscando precios en vivo…",
          success: "Precio listo",
          error: "No se pudo buscar",
        }}
        onClick={onSearch}
        disabled={!searchReady}
        className="shadow-lg"
      >
        {`Cotizar ${activeDestination?.city ?? "viaje"} en vivo`}
      </ActionButton>

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs text-muted">
        <span className="inline-flex items-center gap-1 text-lagoon">
          <ShieldCheck aria-hidden="true" className="size-3.5" />
          Caché anónima 5 min · Sin cuenta
        </span>
        <span>·</span>
        <Link to="/privacidad" className="font-medium text-ink underline hover:text-clay">
          Política de Privacidad
        </Link>
        <span>·</span>
        <span>Se instala en la pantalla de inicio</span>
      </div>
    </section>
  );
}
