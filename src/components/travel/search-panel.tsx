import { Link } from "@tanstack/react-router";
import { Check, Minus, Plus, Search } from "lucide-react";
import { useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { cx } from "@/lib/cx";
import { DESTINATIONS, ORIGINS } from "@/lib/travel/catalog";
import { ActionButton } from "@/components/interactions/action-button";
import { Field, controlClass } from "@/components/interactions/field";
import { ScrollRail } from "@/components/interactions/scroll-rail";
import { SearchCombobox, type ComboOption } from "@/components/interactions/search-combobox";
import { Switch } from "@/components/interactions/switch";
import { fieldErrorId, fieldHintId } from "@/lib/interactions/dom-ids";
import type { ActionState } from "@/lib/interactions/use-action-feedback";
import { addIsoDays, mexicoDate, type SearchParams } from "./travel-model";

const ORIGIN_OPTIONS: ComboOption[] = ORIGINS.map((origin) => ({
  value: origin.iata,
  label: `${origin.city} · ${origin.airport}`,
  description: `Aeropuerto ${origin.iata}`,
  keywords: [origin.iata, origin.city, origin.airport],
}));

type DestinationOption = {
  id: string;
  city: string;
  blurb: string;
  groundOnly: boolean | null;
};

const DESTINATION_OPTIONS: DestinationOption[] = [
  ...DESTINATIONS.map((destination) => ({
    id: destination.id,
    city: destination.city,
    blurb: destination.blurb,
    groundOnly: destination.groundOnly,
  })),
  { id: "custom", city: "Otra ciudad", blurb: "México", groundOnly: null },
];

export type SearchPanelProps = {
  params: SearchParams;
  onChange: (patch: Partial<SearchParams>) => void;
  onSearch: () => void;
  flightLikely: boolean;
  searchReady: boolean;
  error: string;
  searchState: ActionState;
};

/**
 * Search form. Everything keeps working with keyboard and touch: the
 * destination picker is a labelled radio rail (tap or arrows, swipe optional),
 * the origin field is a searchable combobox, and the filters are real switches.
 */
export function SearchPanel({
  params,
  onChange,
  onSearch,
  flightLikely,
  searchReady,
  error,
  searchState,
}: SearchPanelProps) {
  const cards = useRef(new Map<string, HTMLButtonElement | null>());
  const datesInvalid = Boolean(
    params.checkIn && params.checkOut && params.checkOut <= params.checkIn,
  );
  const cityInvalid = params.destinationId === "custom" && params.customCity.trim().length < 3;

  function moveSelection(event: ReactKeyboardEvent<HTMLButtonElement>, index: number) {
    const last = DESTINATION_OPTIONS.length - 1;
    let next = -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown")
      next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    else return;
    event.preventDefault();
    const target = DESTINATION_OPTIONS[next];
    onChange({ destinationId: target.id });
    cards.current.get(target.id)?.focus();
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="mb-2 text-sm text-muted">Destino</p>
        <ScrollRail
          label="Destino"
          role="radiogroup"
          focusable={false}
          itemSnap="center"
          snap="proximity"
          activeValue={params.destinationId}
          gridClassName="sm:grid sm:grid-cols-2 sm:max-h-72 sm:overflow-y-auto"
          hintLabel="Desliza"
        >
          {DESTINATION_OPTIONS.map((option, index) => {
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
                  "tap press lift relative min-w-36 shrink-0 rounded-card border px-3 py-3 text-left sm:min-w-0",
                  "bg-elev",
                  selected ? "border-clay ring-1 ring-clay" : "border-line",
                )}
              >
                {selected ? (
                  <span className="absolute top-2 right-2 grid size-5 place-items-center rounded-full bg-clay text-clay-ink">
                    <Check aria-hidden="true" className="size-3" strokeWidth={3} />
                  </span>
                ) : null}
                <span className="block font-display text-lg leading-tight">{option.city}</span>
                <span className="mt-1 block text-xs text-muted">{option.blurb}</span>
                <span
                  className={cx(
                    "mt-2 inline-block text-xs",
                    selected ? "text-clay" : "text-lagoon",
                  )}
                >
                  {option.groundOnly === null
                    ? "Buscar"
                    : option.groundOnly
                      ? "Sin vuelo"
                      : "Con vuelo"}
                </span>
              </button>
            );
          })}
        </ScrollRail>
      </div>

      {params.destinationId === "custom" ? (
        <Field
          label="Ciudad"
          htmlFor="search-city"
          hint="Escribe al menos tres letras para consultar precios."
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
      ) : null}

      {flightLikely ? (
        <SearchCombobox
          id="search-origin"
          label="Sales de"
          options={ORIGIN_OPTIONS}
          value={params.originIata}
          onChange={(value) => onChange({ originIata: value })}
          hint="Busca por ciudad, aeropuerto o código de tres letras."
        />
      ) : (
        <p className="rounded-card border border-line bg-lagoon-soft px-4 py-3 text-sm text-ink">
          Cuernavaca, Veracruz y Acapulco se cotizan sin vuelo.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Llegada" htmlFor="search-checkin">
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
          label="Salida"
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

      <div className="flex min-h-12 items-center justify-between rounded-card border border-line bg-elev px-4 py-2">
        <label htmlFor="search-adults" className="text-sm">
          Adultos
        </label>
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
            className="w-6 text-center font-medium tabular-nums"
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

      <div role="group" aria-label="Filtros" className="space-y-2">
        <Switch
          checked={params.cabinOnly}
          onChange={(value) => onChange({ cabinOnly: value })}
          label="Solo tarifas con maleta de mano"
        />
        <Switch
          checked={params.arriveBy14}
          onChange={(value) => onChange({ arriveBy14: value })}
          label="Llegar a más tardar a las 2 pm"
        />
      </div>

      {cityInvalid ? (
        <p className="text-sm text-muted">Escribe el nombre de la ciudad para consultar.</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-warn">
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
          loading: "Buscando precios…",
          success: "Precio listo",
          error: "No se pudo buscar",
        }}
        onClick={onSearch}
        disabled={!searchReady}
      >
        {`Ver precio en vivo`}
      </ActionButton>

      <p className="text-center text-xs text-muted">
        <Link to="/privacidad" className="underline">
          Privacidad
        </Link>
        {" · "}
        Se instala en la pantalla de inicio del teléfono.
      </p>
    </section>
  );
}
