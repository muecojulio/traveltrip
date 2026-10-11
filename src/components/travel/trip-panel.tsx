import {
  Bookmark,
  Building2,
  Check,
  Clock3,
  Database,
  LoaderCircle,
  Luggage,
  Plane,
  RefreshCw,
  Sparkles,
  Star,
  TriangleAlert,
  Users,
} from "lucide-react";
import { cx } from "@/lib/cx";
import type { FlightOffer, Quote } from "@/lib/travel/types";
import { ActionButton } from "@/components/interactions/action-button";
import { LinkChip } from "@/components/interactions/chip";
import { Disclosure } from "@/components/interactions/disclosure";
import { ScrollRail } from "@/components/interactions/scroll-rail";
import type { ActionState } from "@/lib/interactions/use-action-feedback";
import { WeatherIllustration } from "./mexican-art";
import { comboForHotel, money } from "./travel-model";

type TripPanelProps = {
  quote: Quote | null;
  loading: boolean;
  refreshState: ActionState;
  saveState: ActionState;
  onSave: () => void;
  onRefresh: () => void;
  onSelectHotel: (hotelName: string) => void;
  selectedHotelName: string;
  saved: boolean;
};

export function TripPanel({
  quote,
  loading,
  refreshState,
  saveState,
  onSave,
  onRefresh,
  onSelectHotel,
  selectedHotelName,
  saved,
}: TripPanelProps) {
  if (!quote && loading) {
    return (
      <div
        className="space-y-3 rounded-card border border-line bg-elev p-6 card-shadow"
        role="status"
      >
        <div className="flex items-center gap-3">
          <LoaderCircle aria-hidden="true" className="spin size-5 text-clay" />
          <p className="font-display text-lg">Consultando hoteles y vuelos en vivo…</p>
        </div>
        <p className="text-xs text-muted">
          Verificando tarifas con maleta de mano, llegadas antes de las 14:00 y clima del destino.
        </p>
      </div>
    );
  }
  if (!quote) {
    return (
      <div className="rounded-card border border-line bg-elev p-6 text-center card-shadow">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-lagoon-soft text-lagoon">
          <Plane aria-hidden="true" className="size-6" />
        </span>
        <h2 className="mt-3 font-display text-2xl text-ink">Tu cotización aparecerá aquí</h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">
          Elige un destino en la pestaña <strong>Buscar</strong> para comparar estancia de hotel +
          vuelo redondo y calcular la combinación más baja en vivo.
        </p>
      </div>
    );
  }

  const flights = quote.flights ?? [];
  const otherFlights = quote.otherFlights ?? [];
  const hotels = quote.hotels ?? [];
  const alternatives = quote.alternatives ?? [];
  const notices = quote.notices ?? [];
  const weather = quote.weather ?? [];
  const cityLinks = quote.cityLinks ?? [];
  const selectedCombo = comboForHotel(quote, selectedHotelName);
  const displayCombo = selectedCombo ?? quote.best;
  const hotelShare =
    displayCombo && displayCombo.totalMxn > 0
      ? Math.round((displayCombo.hotelMxn / displayCombo.totalMxn) * 100)
      : 0;
  const flightShare = Math.max(0, 100 - hotelShare);
  const perPersonMxn =
    displayCombo && quote.adults > 0 ? Math.round(displayCombo.totalMxn / quote.adults) : null;
  const cheapestHotelMxn = hotels[0]?.stayTotalMxn ?? 0;

  const fetchedAt = new Date(quote.fetchedAt);
  const fetchedAtLabel = Number.isNaN(fetchedAt.valueOf())
    ? "Hora de consulta no disponible"
    : fetchedAt.toLocaleString("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Mexico_City",
      });
  const selectedName = selectedCombo?.hotelName ?? quote.best?.hotelName ?? "";

  return (
    <section className="space-y-5">
      {/* Destination Header & Actions */}
      <div className="rounded-card border border-line bg-elev p-4 card-shadow">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-lagoon-soft px-2.5 py-0.5 text-xs font-semibold text-lagoon">
                {quote.state}
              </span>
              <span
                className={cx(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                  quote.cached
                    ? "bg-marigold/20 text-ink"
                    : "bg-jade/20 text-good",
                )}
              >
                <Database aria-hidden="true" className="size-3" />
                {quote.cached ? "Caché rápida (5 min)" : "Precio en vivo"}
              </span>
            </div>

            <h1 className="mt-2 font-display text-3xl leading-none sm:text-4xl">{quote.place}</h1>
            <p className="mt-2 text-sm text-muted">
              {quote.checkIn} → {quote.checkOut} ·{" "}
              <strong>
                {quote.nights} {quote.nights === 1 ? "noche" : "noches"}
              </strong>{" "}
              ·{" "}
              <strong>
                {quote.adults} {quote.adults === 1 ? "adulto" : "adultos"}
              </strong>
            </p>
            {quote.originLabel ? (
              <p className="mt-0.5 text-xs text-muted">Salida desde: {quote.originLabel}</p>
            ) : null}
            <p className="mt-1 text-xs text-muted">Consultado: {fetchedAtLabel}</p>
            {loading ? (
              <p className="mt-1 text-xs font-medium text-clay" role="status">
                Actualizando precios en vivo…
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 gap-2">
            <ActionButton
              size="icon"
              variant="secondary"
              state={refreshState}
              label="Actualizar precios"
              onClick={onRefresh}
              className="rounded-full"
              labels={{
                loading: <LoaderCircle aria-hidden="true" className="spin size-4" />,
                success: <Check aria-hidden="true" className="size-4" />,
                error: <TriangleAlert aria-hidden="true" className="size-4" />,
              }}
            >
              <RefreshCw aria-hidden="true" className="size-4" />
            </ActionButton>
            <ActionButton
              size="icon"
              variant="secondary"
              state={saveState}
              label={saved ? "Viaje guardado" : "Guardar viaje"}
              onClick={onSave}
              disabled={saved}
              className="rounded-full"
              labels={{
                loading: <LoaderCircle aria-hidden="true" className="spin size-4" />,
                success: <Check aria-hidden="true" className="size-4" />,
                error: <TriangleAlert aria-hidden="true" className="size-4" />,
              }}
            >
              <Bookmark
                aria-hidden="true"
                className={cx("size-4", saved && "fill-clay text-clay")}
              />
            </ActionButton>
          </div>
        </div>
      </div>

      {/* Boarding-Pass / Package Total Card */}
      {displayCombo ? (
        <article className="card-shadow overflow-hidden rounded-card border-2 border-clay bg-elev">
          <div className="bg-gradient-to-r from-clay/18 via-marigold/12 to-lagoon-soft px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-clay uppercase">
                <Sparkles aria-hidden="true" className="size-3.5" />
                {selectedName && selectedName !== quote.best?.hotelName
                  ? "Total con tu hotel seleccionado"
                  : "Combinación más barata disponible"}
              </p>
              {perPersonMxn !== null ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-elev/90 px-2.5 py-0.5 text-xs font-medium text-ink">
                  <Users aria-hidden="true" className="size-3 text-lagoon" />
                  {money(perPersonMxn)} por persona
                </span>
              ) : null}
            </div>
          </div>

          <div className="p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-4xl text-ink sm:text-5xl">
                {money(displayCombo.totalMxn)}
              </p>
              <span className="text-xs text-muted">
                Total estimado por {quote.adults} {quote.adults === 1 ? "adulto" : "adultos"}
              </span>
            </div>

            <p className="mt-2.5 text-sm leading-relaxed text-ink">{displayCombo.why}</p>

            {/* Proportional Breakdown Bar */}
            <div className="ticket-divider mt-4 pt-4">
              <div
                aria-hidden="true"
                className="flex h-3 overflow-hidden rounded-full bg-line p-0.5"
              >
                <div
                  className="h-full rounded-l-full bg-lagoon transition-[width] duration-300 ease-soft"
                  style={{ width: `${hotelShare}%` }}
                />
                {quote.flightMode && flightShare > 0 ? (
                  <div
                    className="h-full rounded-r-full bg-clay transition-[width] duration-300 ease-soft"
                    style={{ width: `${flightShare}%` }}
                  />
                ) : null}
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-line bg-bg/60 px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 font-medium text-lagoon">
                    <span className="size-2 rounded-full bg-lagoon" />
                    Estancia ({hotelShare}%)
                  </span>
                  <p className="mt-0.5 font-display text-base text-ink">
                    {money(displayCombo.hotelMxn)}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-bg/60 px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 font-medium text-clay">
                    <span className="size-2 rounded-full bg-clay" />
                    {quote.flightMode ? `Vuelo redondo (${flightShare}%)` : "Transporte"}
                  </span>
                  <p className="mt-0.5 font-display text-base text-ink">
                    {quote.flightMode ? money(displayCombo.flightMxn) : "Sin vuelo"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </article>
      ) : (
        <p className="rounded-card border border-line bg-elev px-4 py-4 text-sm">
          {quote.flightMode
            ? "No hay una tarifa confirmada que cumpla la llegada y la maleta de mano. Consulta los enlaces de vuelo y verifica el equipaje antes de sumar un total."
            : "No hubo tarifas de hotel legibles para calcular un total. Abre Booking o Despegar con las fechas elegidas."}
        </p>
      )}

      {/* Quick Alternatives Comparator (uses quote.alternatives) */}
      {alternatives.length > 0 && quote.best ? (
        <div className="rounded-card border border-line bg-elev p-4 card-shadow">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            Comparativa rápida de paquetes alternativos
          </p>
          <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {alternatives.map((alt) => {
              const delta = alt.totalMxn - (quote.best?.totalMxn ?? alt.totalMxn);
              const isSelected = alt.hotelName === selectedName;
              return (
                <button
                  key={alt.hotelName}
                  type="button"
                  onClick={() => onSelectHotel(alt.hotelName)}
                  className={cx(
                    "tap press lift rounded-xl border p-3 text-left transition-colors",
                    isSelected
                      ? "border-clay bg-clay/10 ring-1 ring-clay"
                      : "border-line bg-bg/60 hover:border-lagoon/50",
                  )}
                >
                  <span className="block truncate text-xs font-semibold text-ink">
                    {alt.hotelName}
                  </span>
                  <span className="mt-1 block font-display text-lg text-ink">
                    {money(alt.totalMxn)}
                  </span>
                  <span className="mt-0.5 inline-block text-[11px] font-medium text-clay">
                    +{money(delta)} vs más bajo
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Weather Forecast Strip */}
      {weather.length > 0 ? (
        <div className="rounded-card border border-line bg-elev p-4 card-shadow">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="font-display text-lg text-ink">Pronóstico en {quote.place}</h2>
            <span className="text-xs text-muted">Open-Meteo</span>
          </div>
          <ScrollRail
            label="Clima por día"
            itemSnap="start"
            snap="proximity"
            gridClassName="sm:grid sm:grid-cols-4"
          >
            {weather.map((day) => (
              <div
                key={day.date}
                className="flex min-w-36 shrink-0 items-center gap-2.5 rounded-xl border border-line bg-bg/65 px-3 py-2.5 sm:min-w-0"
              >
                <WeatherIllustration label={day.label} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted">{day.date.slice(5)}</p>
                  <p className="truncate text-xs font-semibold text-ink">{day.label}</p>
                  <p className="text-xs text-ink">
                    <strong>{day.max != null ? `${Math.round(day.max)}°` : "—"}</strong> /{" "}
                    <span className="text-muted">
                      {day.min != null ? `${Math.round(day.min)}°` : "—"}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </ScrollRail>
        </div>
      ) : null}

      {/* Direct Comparison Portals */}
      {cityLinks.length > 0 ? (
        <div className="rounded-card border border-line bg-elev p-4 card-shadow">
          <p className="mb-2.5 text-xs font-semibold tracking-wide text-muted uppercase">
            Comparar ruta directamente en portales externos
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Búsquedas sugeridas">
            {cityLinks.map((link) => (
              <LinkChip key={link.label} href={link.href} target="_blank" tone="accent">
                {link.label}
              </LinkChip>
            ))}
          </div>
        </div>
      ) : null}

      {/* Round-Trip Flights Section */}
      {quote.flightMode ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-2xl">
              <Plane aria-hidden="true" className="size-5 text-clay" /> Vuelos de ida y vuelta
            </h2>
            {quote.hiddenFlights > 0 ? (
              <span className="text-xs text-muted">
                +{quote.hiddenFlights} tarifas adicionales omitidas
              </span>
            ) : null}
          </div>

          {otherFlights.length > 0 ? (
            <p className="text-xs text-muted">
              {flights.length === 0
                ? "Estas tarifas no cumplen todos los filtros activos; sirven para comparar y revisar su equipaje."
                : `${otherFlights.length} alternativas no cumplen la hora o la maleta de mano seleccionada.`}
            </p>
          ) : null}

          <div className="space-y-3">
            {flights.length === 0 && otherFlights.length === 0 ? (
              <p className="rounded-card border border-line bg-elev p-4 text-sm text-muted">
                No hay tarifas comprobables ahora. Usa Google Flights, Despegar o los sitios
                oficiales de las aerolíneas de arriba para buscar la ruta.
              </p>
            ) : null}
            {flights.map((flight, index) => (
              <FlightCard key={flight.id} flight={flight} isCheapest={index === 0} />
            ))}
          </div>

          {otherFlights.length > 0 ? (
            <Disclosure
              className="mt-3"
              count={otherFlights.length}
              summary="Ver otras tarifas para comparar"
              description="No cumplen la hora de llegada o la maleta de mano que elegiste."
            >
              <div className="space-y-3">
                {otherFlights.map((flight) => (
                  <FlightCard key={flight.id} flight={flight} muted />
                ))}
              </div>
            </Disclosure>
          ) : null}
        </div>
      ) : null}

      {/* Hotels Section */}
      <div className="space-y-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl">
            <Building2 aria-hidden="true" className="size-5 text-lagoon" /> Hoteles en {quote.place}
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Toca cualquier hotel para recalcular el paquete total al instante.
          </p>
        </div>

        <div className="stagger space-y-3">
          {hotels.length === 0 ? (
            <p className="rounded-card border border-line bg-elev p-4 text-sm text-muted">
              No hubo tarifas de hotel legibles. Abre Booking o Despegar arriba.
            </p>
          ) : (
            hotels.map((hotel, index) => {
              const selected = hotel.name === selectedName;
              const diffFromCheapest = hotel.stayTotalMxn - cheapestHotelMxn;
              return (
                <article
                  key={hotel.name}
                  className={cx(
                    "lift rounded-card border bg-elev p-4 transition-colors card-shadow",
                    selected ? "border-clay ring-1 ring-clay" : "border-line",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelectHotel(hotel.name)}
                    aria-pressed={selected}
                    className="tap press flex min-h-16 w-full items-start justify-between gap-3 text-left"
                  >
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5">
                        {index === 0 ? (
                          <span className="rounded-full bg-jade/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-good uppercase">
                            Tarifa más baja
                          </span>
                        ) : diffFromCheapest > 0 ? (
                          <span className="rounded-full bg-line/70 px-2 py-0.5 text-[10px] font-medium text-muted">
                            +{money(diffFromCheapest)} estancia
                          </span>
                        ) : null}
                      </span>

                      <span className="mt-1 block font-display text-lg leading-snug text-ink">
                        {hotel.name}
                      </span>

                      <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted">
                        {hotel.rating ? (
                          <span className="inline-flex items-center gap-1 font-medium text-marigold">
                            <Star aria-hidden="true" className="size-3.5 fill-marigold" />
                            {hotel.rating.toFixed(1)} / 5
                          </span>
                        ) : (
                          "Sin calificación"
                        )}
                        {hotel.reviews ? ` · ${hotel.reviews.toLocaleString("es-MX")} reseñas` : ""}
                      </span>

                      <span
                        className={cx(
                          "mt-2 flex items-center gap-1 text-xs font-medium",
                          selected ? "text-clay" : "text-lagoon",
                        )}
                      >
                        {selected ? (
                          <>
                            <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
                            Hotel elegido en tu cotización
                          </>
                        ) : (
                          "Usar este hotel en el total"
                        )}
                      </span>
                    </span>

                    <span className="shrink-0 text-right">
                      <span className="block font-display text-2xl text-ink">
                        {money(hotel.stayTotalMxn)}
                      </span>
                      <span className="block text-xs text-muted">
                        {money(hotel.perNightMxn)} / noche
                      </span>
                    </span>
                  </button>

                  <p className="mt-2 text-xs text-muted">{hotel.source}</p>
                  <div
                    className="mt-3 flex flex-wrap gap-2"
                    role="group"
                    aria-label={`Enlaces de ${hotel.name}`}
                  >
                    {hotel.links.map((link) => (
                      <LinkChip key={link.label} href={link.href} target="_blank">
                        {link.label}
                      </LinkChip>
                    ))}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      {/* Transparency Notices & Exchange Rate */}
      {notices.length > 0 || quote.usdMxn ? (
        <Disclosure
          defaultOpen={notices.length <= 2}
          count={notices.length}
          summary="Notas de transparencia y tipo de cambio"
          description="Cómo se calculó este precio y qué falta confirmar antes de reservar."
        >
          <ul className="space-y-2 text-xs leading-relaxed text-muted">
            {notices.map((notice) => (
              <li key={notice} className="flex gap-2">
                <span aria-hidden="true" className="text-clay">
                  •
                </span>
                <span>{notice}</span>
              </li>
            ))}
            {quote.usdMxn ? (
              <li className="flex gap-2 font-medium text-ink">
                <span aria-hidden="true" className="text-lagoon">
                  •
                </span>
                <span>Tipo de cambio público aplicado: 1 USD = {quote.usdMxn.toFixed(2)} MXN.</span>
              </li>
            ) : null}
          </ul>
        </Disclosure>
      ) : null}
    </section>
  );
}

function FlightCard({
  flight,
  muted = false,
  isCheapest = false,
}: {
  flight: FlightOffer;
  muted?: boolean;
  isCheapest?: boolean;
}) {
  return (
    <article
      className={cx(
        "lift rounded-card border bg-elev p-4 transition-colors card-shadow",
        muted ? "border-line" : isCheapest ? "border-clay ring-1 ring-clay/60" : "border-lagoon",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            {isCheapest && !muted ? (
              <span className="rounded-full bg-clay/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-clay uppercase">
                Vuelo más bajo
              </span>
            ) : null}
            <span className="rounded-full bg-lagoon-soft px-2 py-0.5 text-[10px] font-medium text-lagoon">
              {flight.direct ? "Directo" : "Con escala"}
            </span>
          </div>
          <p className="mt-1 font-display text-lg text-ink">{flight.airline}</p>
          <p className="text-xs text-muted">
            {flight.numbers.length ? flight.numbers.join(" · ") : flight.source}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl text-ink">{money(flight.priceMxn)}</p>
          <p className="text-xs text-muted">ida y vuelta · grupo</p>
        </div>
      </div>

      {/* Visual Flight Timeline */}
      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-line bg-bg/60 px-3 py-2 text-sm">
        <div>
          <span className="block font-semibold tabular-nums">{flight.departureTime}</span>
          <span className="text-xs text-muted">{flight.departureAirport}</span>
        </div>
        <div className="flex flex-1 flex-col items-center px-2">
          <span className="text-[10px] text-muted">
            {flight.durationMinutes
              ? `${Math.floor(flight.durationMinutes / 60)}h ${flight.durationMinutes % 60}m`
              : "Redondo"}
          </span>
          <div className="my-1 flex w-full items-center gap-1">
            <span className="h-px flex-1 bg-line" />
            <Plane aria-hidden="true" className="size-3.5 text-clay" />
            <span className="h-px flex-1 bg-line" />
          </div>
        </div>
        <div className="text-right">
          <span className="block font-semibold tabular-nums">{flight.arrivalTime}</span>
          <span className="text-xs text-muted">{flight.arrivalAirport}</span>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
        <span
          className={cx(
            "inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 py-1 font-medium",
            flight.arrivesBy14 ? "bg-lagoon-soft text-good" : "bg-line/70 text-warn",
          )}
        >
          <Clock3 aria-hidden="true" className="size-3" />
          {flight.arrivesBy14
            ? "Llega el mismo día ≤ 14:00"
            : flight.sameDay
              ? `Llega ${flight.arrivalTime} · después de las 14:00`
              : `Llega ${flight.arrivalDate || "otro día"} · ${flight.arrivalTime}`}
        </span>
        <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-lagoon-soft px-2.5 py-1 font-medium text-ink">
          <Luggage aria-hidden="true" className="size-3 text-lagoon" />
          {flight.cabinIncluded === true
            ? "Maleta de mano incluida"
            : flight.cabinIncluded === false
              ? "Sin maleta de mano"
              : "Maleta de mano por confirmar"}
        </span>
      </div>

      {flight.rejectReason ? <p className="mt-2 text-xs text-warn">{flight.rejectReason}</p> : null}

      <div
        className="mt-3 flex flex-wrap gap-2"
        role="group"
        aria-label={`Enlaces de ${flight.airline}`}
      >
        {flight.links.map((link) => (
          <LinkChip key={link.label} href={link.href} target="_blank">
            {link.label}
          </LinkChip>
        ))}
      </div>
    </article>
  );
}
