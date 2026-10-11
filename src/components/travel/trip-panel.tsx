import { Bookmark, Check, LoaderCircle, Luggage, Plane, TriangleAlert } from "lucide-react";
import { cx } from "@/lib/cx";
import type { FlightOffer, Quote } from "@/lib/travel/types";
import { ActionButton } from "@/components/interactions/action-button";
import { LinkChip } from "@/components/interactions/chip";
import { Disclosure } from "@/components/interactions/disclosure";
import { ScrollRail } from "@/components/interactions/scroll-rail";
import type { ActionState } from "@/lib/interactions/use-action-feedback";
import { comboForHotel, money } from "./travel-model";

export type TripPanelProps = {
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
      <p className="rounded-card border border-line bg-elev px-4 py-6 text-sm" role="status">
        Consultando hoteles y vuelos…
      </p>
    );
  }
  if (!quote) {
    return (
      <p className="rounded-card border border-line bg-elev px-4 py-6 text-sm text-muted">
        Aquí aparece el total cuando busques un destino.
      </p>
    );
  }

  const flights = quote.flights ?? [];
  const otherFlights = quote.otherFlights ?? [];
  const hotels = quote.hotels ?? [];
  const notices = quote.notices ?? [];
  const weather = quote.weather ?? [];
  const cityLinks = quote.cityLinks ?? [];
  const selectedCombo = comboForHotel(quote, selectedHotelName);
  const displayCombo = selectedCombo ?? quote.best;
  const hotelShare =
    displayCombo && displayCombo.totalMxn > 0
      ? Math.round((displayCombo.hotelMxn / displayCombo.totalMxn) * 100)
      : 0;
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
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl leading-none">{quote.place}</h1>
          <p className="mt-2 text-sm text-muted">
            {quote.state} · {quote.nights} {quote.nights === 1 ? "noche" : "noches"} ·{" "}
            {quote.adults} {quote.adults === 1 ? "adulto" : "adultos"}
          </p>
          {quote.originLabel ? (
            <p className="text-sm text-muted">Desde {quote.originLabel}</p>
          ) : null}
          <p className="mt-1 text-xs text-muted">
            {quote.cached ? "Precio consultado recientemente" : "Consulta de precios"} ·{" "}
            {fetchedAtLabel}
            {quote.cached ? " · caché máx. 5 min" : ""}
          </p>
          {loading ? (
            <p className="mt-1 text-xs text-clay" role="status">
              Actualizando precios…
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
          />
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
            <Bookmark aria-hidden="true" className={cx("size-4", saved && "fill-clay text-clay")} />
          </ActionButton>
        </div>
      </div>

      {displayCombo ? (
        <article className="card-shadow rounded-card border border-clay bg-elev p-4">
          <p className="text-xs tracking-wide text-clay uppercase">
            {selectedName && selectedName !== quote.best?.hotelName
              ? "Total con hotel elegido"
              : "Combinación más barata"}
          </p>
          <p className="mt-1 font-display text-4xl">{money(displayCombo.totalMxn)}</p>
          <p className="mt-2 text-sm leading-relaxed">{displayCombo.why}</p>
          <div aria-hidden="true" className="mt-4 h-2 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-lagoon transition-[width] duration-300 ease-soft"
              style={{ width: `${hotelShare}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            Hotel {money(displayCombo.hotelMxn)}
            {quote.flightMode
              ? ` · Vuelo redondo ${money(displayCombo.flightMxn)}`
              : " · sin vuelo"}
          </p>
        </article>
      ) : (
        <p className="rounded-card border border-line bg-elev px-4 py-4 text-sm">
          {quote.flightMode
            ? "No hay una tarifa confirmada que cumpla la llegada y la maleta de mano. Consulta los enlaces de vuelo y verifica el equipaje antes de sumar un total."
            : "No hubo tarifas de hotel legibles para calcular un total. Abre Booking o Despegar con las fechas elegidas."}
        </p>
      )}

      {weather.length > 0 ? (
        <ScrollRail
          label="Clima por día"
          itemSnap="start"
          snap="proximity"
          gridClassName="sm:grid sm:grid-cols-4"
        >
          {weather.map((day) => (
            <div
              key={day.date}
              className="min-w-28 shrink-0 rounded-card border border-line bg-elev px-3 py-2 sm:min-w-0"
            >
              <p className="text-xs text-muted">{day.date.slice(5)}</p>
              <p className="text-sm">{day.label}</p>
              <p className="text-sm text-ink">
                {day.max != null ? `${Math.round(day.max)}°` : "—"} /{" "}
                {day.min != null ? `${Math.round(day.min)}°` : "—"}
              </p>
            </div>
          ))}
        </ScrollRail>
      ) : null}

      {cityLinks.length > 0 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Búsquedas sugeridas">
          {cityLinks.map((link) => (
            <LinkChip key={link.label} href={link.href} target="_blank">
              {link.label}
            </LinkChip>
          ))}
        </div>
      ) : null}

      {quote.flightMode ? (
        <div>
          <h2 className="mb-2 flex items-center gap-2 font-display text-2xl">
            <Plane aria-hidden="true" className="size-5" /> Vuelos de ida y vuelta
          </h2>
          {otherFlights.length > 0 ? (
            <p className="mb-2 text-xs text-muted">
              {flights.length === 0
                ? "Estas tarifas no cumplen todos los filtros activos; sirven para comparar y revisar su equipaje."
                : `${otherFlights.length} alternativas no cumplen la hora o la maleta de mano seleccionada.`}
            </p>
          ) : null}
          <div className="space-y-3">
            {flights.length === 0 && otherFlights.length === 0 ? (
              <p className="text-sm text-muted">
                No hay tarifas comprobables ahora. Usa Google Flights, Despegar o los sitios
                oficiales de las aerolíneas de arriba para buscar la ruta.
              </p>
            ) : null}
            {flights.map((flight) => (
              <FlightCard key={flight.id} flight={flight} />
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

      <div>
        <h2 className="mb-1 font-display text-2xl">Hoteles</h2>
        <p className="mb-2 text-xs text-muted">
          Elige uno para actualizar el total con el vuelo más barato que cumple tus filtros.
        </p>
        <div className="stagger space-y-3">
          {hotels.length === 0 ? (
            <p className="text-sm text-muted">
              No hubo tarifas de hotel legibles. Abre Booking o Despegar arriba.
            </p>
          ) : (
            hotels.map((hotel) => {
              const selected = hotel.name === selectedName;
              return (
                <article
                  key={hotel.name}
                  className={cx(
                    "lift rounded-card border bg-elev p-4 transition-colors",
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
                      <span className="block font-medium leading-snug">{hotel.name}</span>
                      <span className="mt-1 block text-xs text-muted">
                        {hotel.rating ? `${hotel.rating.toFixed(1)} / 5` : "Sin calificación"}
                        {hotel.reviews ? ` · ${hotel.reviews} reseñas` : ""}
                      </span>
                      <span
                        className={cx(
                          "mt-2 inline-flex items-center gap-1 text-xs",
                          selected ? "text-clay" : "text-lagoon",
                        )}
                      >
                        {selected ? (
                          <>
                            <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
                            Hotel elegido
                          </>
                        ) : (
                          "Seleccionar este hotel"
                        )}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-display text-2xl">
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
                    aria-label="Enlaces del hotel"
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

      {notices.length > 0 || quote.usdMxn ? (
        <Disclosure
          defaultOpen={notices.length <= 2}
          count={notices.length}
          summary="Notas y avisos"
          description="Cómo se calculó este precio y qué falta confirmar."
        >
          <ul className="space-y-2 text-xs leading-relaxed text-muted">
            {notices.map((notice) => (
              <li key={notice}>{notice}</li>
            ))}
            {quote.usdMxn ? (
              <li>Tipo de cambio público: 1 USD = {quote.usdMxn.toFixed(2)} MXN.</li>
            ) : null}
          </ul>
        </Disclosure>
      ) : null}
    </section>
  );
}

function FlightCard({ flight, muted = false }: { flight: FlightOffer; muted?: boolean }) {
  return (
    <article
      className={cx(
        "lift rounded-card border bg-elev p-4 transition-colors",
        muted ? "border-line" : "border-lagoon",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{flight.airline}</p>
          <p className="text-sm text-muted">
            {flight.numbers.length ? flight.numbers.join(" · ") : flight.source}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl">{money(flight.priceMxn)}</p>
          <p className="text-xs text-muted">ida y vuelta · grupo</p>
        </div>
      </div>
      <p className="mt-2 text-sm">
        {flight.departureAirport} {flight.departureTime} → {flight.arrivalAirport}{" "}
        {flight.arrivalTime}
      </p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span
          className={cx(
            "inline-flex min-h-8 items-center rounded-full px-2 py-1",
            flight.arrivesBy14 ? "bg-lagoon-soft text-good" : "bg-line text-warn",
          )}
        >
          {flight.arrivesBy14
            ? "Llega el mismo día antes de las 14:00"
            : flight.sameDay
              ? `Llega ${flight.arrivalTime} · después de las 14:00`
              : `Llega ${flight.arrivalDate || "otro día"} · ${flight.arrivalTime}`}
        </span>
        <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-lagoon-soft px-2 py-1">
          <Luggage aria-hidden="true" className="size-3" />
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
