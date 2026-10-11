import { Link } from "@tanstack/react-router";
import {
  Bookmark,
  Compass,
  Luggage,
  Moon,
  Plane,
  Search,
  SunMedium,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DESTINATIONS, ORIGINS } from "@/lib/travel/catalog";
import { searchTrip } from "@/lib/travel/search-fn";
import type { FlightOffer, Quote } from "@/lib/travel/types";

type Tab = "buscar" | "viaje" | "guardados";

type Saved = { id: string; quote: Quote };

const SAVED_KEY = "traveltrip-saved";

function mexicoDate(offsetDays: number): string {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, (day ?? 1) + offsetDays));
  return date.toISOString().slice(0, 10);
}

function money(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function Switch({
  on,
  label,
  onChange,
}: {
  on: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="press flex min-h-12 w-full items-center justify-between gap-3 rounded-card border border-line bg-elev px-4 text-left"
    >
      <span className="text-sm text-ink">{label}</span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full ${on ? "bg-lagoon" : "bg-line"}`}>
        <span
          className={`switch-knob absolute top-0.5 size-6 rounded-full bg-knob ${on ? "left-5" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

export function TravelApp() {
  const [tab, setTab] = useState<Tab>("buscar");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [themeReady, setThemeReady] = useState(false);
  const [destinationId, setDestinationId] = useState("cuernavaca");
  const [customCity, setCustomCity] = useState("");
  const [originIata, setOriginIata] = useState("MEX");
  const [checkIn, setCheckIn] = useState(() => mexicoDate(21));
  const [checkOut, setCheckOut] = useState(() => mexicoDate(23));
  const [adults, setAdults] = useState(2);
  const [cabinOnly, setCabinOnly] = useState(true);
  const [arriveBy14, setArriveBy14] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [saved, setSaved] = useState<Saved[]>([]);

  const destination = DESTINATIONS.find((item) => item.id === destinationId);
  const flightLikely = destination ? !destination.groundOnly && destination.iata !== "MEX" : true;

  useEffect(() => {
    const storedTheme = localStorage.getItem("traveltrip-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
      document.documentElement.dataset.theme = storedTheme;
    }
    setThemeReady(true);
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      if (raw) setSaved(JSON.parse(raw) as Saved[]);
    } catch {
      setSaved([]);
    }
  }, []);

  useEffect(() => {
    if (!themeReady) return;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("traveltrip-theme", theme);
  }, [theme, themeReady]);

  const savedIds = useMemo(() => new Set(saved.map((item) => item.id)), [saved]);

  function persist(next: Saved[]) {
    setSaved(next);
    localStorage.setItem(SAVED_KEY, JSON.stringify(next.slice(0, 8)));
  }

  async function onSearch() {
    setLoading(true);
    setError("");
    try {
      const result = await searchTrip({
        data: {
          destinationId,
          customCity: destinationId === "custom" ? customCity.trim() : "",
          originIata,
          checkIn,
          checkOut,
          adults,
          cabinOnly,
          arriveBy14,
        },
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setQuote(result.quote);
      setTab("viaje");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo buscar.");
    } finally {
      setLoading(false);
    }
  }

  function saveQuote(current: Quote) {
    const id = `${current.place}|${current.checkIn}|${current.checkOut}|${current.adults}`;
    if (savedIds.has(id)) return;
    persist([{ id, quote: current }, ...saved].slice(0, 8));
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-bg text-ink">
      <header className="flex items-center justify-between px-4 pt-5 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative block h-6 w-8" aria-hidden>
              <span className="absolute right-1 bottom-1 h-px w-7 bg-lagoon" />
              <span className="absolute top-0 right-0 size-3 rounded-full bg-clay" />
            </span>
            <p className="font-display text-2xl leading-none">TravelTrip</p>
          </div>
          <p className="mt-1 text-sm text-muted">Hotel en vivo. Vuelo antes de las 2 pm.</p>
        </div>
        <button
          type="button"
          aria-label={theme === "dark" ? "Tema claro" : "Tema oscuro"}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="press grid size-11 place-items-center rounded-full border border-line bg-elev"
        >
          {theme === "dark" ? <SunMedium className="size-5" /> : <Moon className="size-5" />}
        </button>
      </header>

      <div className="px-4 pb-28">
        {tab === "buscar" ? (
          <section className="rise space-y-4">
            <div>
              <p className="mb-2 text-sm text-muted">Destino</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {DESTINATIONS.map((item) => {
                  const selected = item.id === destinationId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDestinationId(item.id)}
                      className={`press min-w-36 shrink-0 rounded-card border px-3 py-3 text-left ${
                        selected ? "border-clay bg-elev" : "border-line bg-elev"
                      }`}
                    >
                      <span className="block font-display text-lg leading-tight">{item.city}</span>
                      <span className="mt-1 block text-xs text-muted">{item.blurb}</span>
                      <span className="mt-2 inline-block text-xs text-lagoon">
                        {item.groundOnly ? "Sin vuelo" : "Con vuelo"}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setDestinationId("custom")}
                  className={`press min-w-36 shrink-0 rounded-card border px-3 py-3 text-left ${
                    destinationId === "custom" ? "border-clay bg-elev" : "border-line bg-elev"
                  }`}
                >
                  <span className="block font-display text-lg leading-tight">Otra ciudad</span>
                  <span className="mt-1 block text-xs text-muted">México</span>
                </button>
              </div>
            </div>

            {destinationId === "custom" ? (
              <label className="block text-sm text-muted">
                Ciudad
                <input
                  value={customCity}
                  onChange={(event) => setCustomCity(event.target.value)}
                  placeholder="Por ejemplo, Guanajuato"
                  className="mt-1 min-h-12 w-full rounded-xl border border-line bg-elev px-3"
                />
              </label>
            ) : null}

            {flightLikely || destinationId === "custom" ? (
              <label className="block text-sm text-muted">
                Sales de
                <select
                  value={originIata}
                  onChange={(event) => setOriginIata(event.target.value)}
                  className="mt-1 min-h-12 w-full rounded-xl border border-line bg-elev px-3"
                >
                  {ORIGINS.map((origin) => (
                    <option key={origin.iata} value={origin.iata}>
                      {origin.city} · {origin.airport}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="rounded-card border border-line bg-lagoon-soft px-4 py-3 text-sm text-ink">
                Cuernavaca, Veracruz y Acapulco se cotizan sin vuelo.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-muted">
                Llegada
                <input
                  type="date"
                  value={checkIn}
                  min={mexicoDate(0)}
                  onChange={(event) => setCheckIn(event.target.value)}
                  className="mt-1 min-h-12 w-full rounded-xl border border-line bg-elev px-3"
                />
              </label>
              <label className="text-sm text-muted">
                Salida
                <input
                  type="date"
                  value={checkOut}
                  min={checkIn}
                  onChange={(event) => setCheckOut(event.target.value)}
                  className="mt-1 min-h-12 w-full rounded-xl border border-line bg-elev px-3"
                />
              </label>
            </div>

            <div className="flex items-center justify-between rounded-card border border-line bg-elev px-4 py-3">
              <span className="text-sm">Adultos</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="press grid size-11 place-items-center rounded-full border border-line"
                  onClick={() => setAdults((value) => Math.max(1, value - 1))}
                  aria-label="Menos adultos"
                >
                  −
                </button>
                <span className="w-4 text-center">{adults}</span>
                <button
                  type="button"
                  className="press grid size-11 place-items-center rounded-full border border-line"
                  onClick={() => setAdults((value) => Math.min(6, value + 1))}
                  aria-label="Más adultos"
                >
                  +
                </button>
              </div>
            </div>

            <Switch on={cabinOnly} onChange={setCabinOnly} label="Solo tarifas con maleta de mano" />
            <Switch on={arriveBy14} onChange={setArriveBy14} label="Llegar a más tardar a las 2 pm" />

            {error ? <p className="text-sm text-warn">{error}</p> : null}

            <button
              type="button"
              disabled={loading}
              onClick={onSearch}
              className="press flex min-h-12 w-full items-center justify-center gap-2 rounded-card bg-clay px-4 font-medium text-clay-ink disabled:opacity-60"
            >
              <Search className="size-4" />
              {loading ? "Buscando precios…" : "Ver precio en vivo"}
            </button>
            <p className="text-center text-xs text-muted">
              <Link to="/privacidad" className="underline">
                Privacidad
              </Link>
              {" · "}
              Se instala en la pantalla de inicio del teléfono.
            </p>
          </section>
        ) : null}

        {tab === "viaje" ? (
          <TripView
            quote={quote}
            loading={loading}
            onSave={() => quote && saveQuote(quote)}
            saved={quote ? savedIds.has(`${quote.place}|${quote.checkIn}|${quote.checkOut}|${quote.adults}`) : false}
          />
        ) : null}

        {tab === "guardados" ? (
          <section className="rise space-y-3">
            {saved.length === 0 ? (
              <p className="rounded-card border border-line bg-elev px-4 py-6 text-sm text-muted">
                Todavía no guardas un viaje. Busca un destino y márcalo.
              </p>
            ) : (
              saved.map((item) => (
                <article key={item.id} className="rounded-card border border-line bg-elev p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-2xl">{item.quote.place}</h2>
                      <p className="text-sm text-muted">
                        {item.quote.checkIn} → {item.quote.checkOut}
                      </p>
                      <p className="mt-2 text-lg">
                        {item.quote.best ? money(item.quote.best.totalMxn) : "Sin total"}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Quitar guardado"
                      className="press grid size-11 place-items-center rounded-full border border-line"
                      onClick={() => persist(saved.filter((row) => row.id !== item.id))}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="press mt-3 min-h-11 text-sm text-lagoon"
                    onClick={() => {
                      setQuote(item.quote);
                      setTab("viaje");
                    }}
                  >
                    Ver detalle
                  </button>
                </article>
              ))
            )}
            <button
              type="button"
              className="text-sm text-muted underline"
              onClick={() => persist([])}
              disabled={saved.length === 0}
            >
              Borrar todo lo guardado en este teléfono
            </button>
          </section>
        ) : null}
      </div>

      <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-bg">
        <div className="mx-auto flex max-w-lg pb-[env(safe-area-inset-bottom)]">
          <NavButton active={tab === "buscar"} onClick={() => setTab("buscar")} label="Buscar" icon={<Compass className="size-5" />} />
          <NavButton active={tab === "viaje"} onClick={() => setTab("viaje")} label="Viaje" icon={<Plane className="size-5" />} />
          <NavButton active={tab === "guardados"} onClick={() => setTab("guardados")} label="Guardados" icon={<Bookmark className="size-5" />} />
        </div>
      </nav>
    </div>
  );
}

function FlightCard({ flight, muted = false }: { flight: FlightOffer; muted?: boolean }) {
  return (
    <article className={`rounded-card border bg-elev p-4 ${muted ? "border-line" : "border-lagoon"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{flight.airline}</p>
          <p className="text-sm text-muted">{flight.numbers.join(" · ")}</p>
        </div>
        <p className="font-display text-2xl">{money(flight.priceMxn)}</p>
      </div>
      <p className="mt-2 text-sm">
        {flight.departureAirport} {flight.departureTime} → {flight.arrivalAirport} {flight.arrivalTime}
      </p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span className={`rounded-full px-2 py-1 ${flight.arrivesBy14 ? "bg-lagoon-soft text-good" : "bg-line text-warn"}`}>
          {flight.arrivesBy14 ? "Llega antes de las 14:00" : flight.rejectReason ?? `Llega ${flight.arrivalTime}`}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-lagoon-soft px-2 py-1">
          <Luggage className="size-3" />
          {flight.cabinIncluded ? "Maleta de mano" : "Sin maleta de mano confirmada"}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {flight.links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="press inline-flex min-h-11 items-center rounded-full border border-line px-3 text-sm"
          >
            {link.label}
          </a>
        ))}
      </div>
    </article>
  );
}

function NavButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`press flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs ${
        active ? "text-clay" : "text-muted"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function TripView({
  quote,
  loading,
  onSave,
  saved,
}: {
  quote: Quote | null;
  loading: boolean;
  onSave: () => void;
  saved: boolean;
}) {
  if (loading) {
    return <p className="rounded-card border border-line bg-elev px-4 py-6 text-sm">Consultando tarifas…</p>;
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
  const hotelShare = quote.best && quote.best.totalMxn > 0
    ? Math.round((quote.best.hotelMxn / quote.best.totalMxn) * 100)
    : 0;
  return (
    <section className="rise space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl leading-none">{quote.place}</h1>
          <p className="mt-2 text-sm text-muted">
            {quote.state} · {quote.nights} {quote.nights === 1 ? "noche" : "noches"} · {quote.adults}{" "}
            {quote.adults === 1 ? "adulto" : "adultos"}
          </p>
          {quote.originLabel ? <p className="text-sm text-muted">Desde {quote.originLabel}</p> : null}
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saved}
          className="press grid size-11 place-items-center rounded-full border border-line bg-elev"
          aria-label="Guardar viaje"
        >
          <Bookmark className={`size-4 ${saved ? "fill-clay text-clay" : ""}`} />
        </button>
      </div>

      {quote.best ? (
        <article className="card-shadow rounded-card border border-clay bg-elev p-4">
          <p className="text-xs tracking-wide text-clay uppercase">Más barato</p>
          <p className="mt-1 font-display text-4xl">{money(quote.best.totalMxn)}</p>
          <p className="mt-2 text-sm leading-relaxed">{quote.best.why}</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full bg-lagoon" style={{ width: `${hotelShare}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">
            Hotel {money(quote.best.hotelMxn)}
            {quote.flightMode ? ` · Vuelo ${money(quote.best.flightMxn)}` : ""}
            {quote.cached ? " · copia reciente" : " · recién consultado"}
          </p>
        </article>
      ) : (
        <p className="rounded-card border border-line bg-elev px-4 py-4 text-sm">
          No hubo una combinación que cumpla las reglas. Revisa los hoteles y, si aplica, afloja la hora o la maleta.
        </p>
      )}

      {weather.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto">
          {weather.map((day) => (
            <div key={day.date} className="min-w-28 rounded-card border border-line bg-elev px-3 py-2">
              <p className="text-xs text-muted">{day.date.slice(5)}</p>
              <p className="text-sm">{day.label}</p>
              <p className="text-sm text-ink">
                {day.max != null ? `${Math.round(day.max)}°` : "—"} / {day.min != null ? `${Math.round(day.min)}°` : "—"}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {cityLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="press inline-flex min-h-11 items-center rounded-full border border-line px-3 text-sm"
          >
            {link.label}
          </a>
        ))}
      </div>

      {quote.flightMode ? (
        <div>
          <h2 className="mb-2 flex items-center gap-2 font-display text-2xl">
            <Plane className="size-5" /> Vuelos
          </h2>
          {otherFlights.length > 0 ? (
            <p className="mb-2 text-xs text-muted">
              {flights.length === 0
                ? "Ninguna de las tarifas más baratas llega antes de las 14:00 con maleta de mano confirmada."
                : `${otherFlights.length} tarifas quedaron fuera por la hora o la maleta de mano.`}
            </p>
          ) : null}
          <div className="space-y-3">
            {flights.length === 0 ? (
              <p className="text-sm text-muted">Abre Despegar o la aerolínea para ver salidas de mañana.</p>
            ) : (
              flights.map((flight) => (
                <FlightCard key={flight.id} flight={flight} />
              ))
            )}
            {otherFlights.map((flight) => (
              <FlightCard key={flight.id} flight={flight} muted />
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <h2 className="mb-2 font-display text-2xl">Hoteles</h2>
        <div className="space-y-3">
          {hotels.length === 0 ? (
            <p className="text-sm text-muted">No hubo tarifas de hotel legibles. Abre Booking o Despegar arriba.</p>
          ) : (
            hotels.map((hotel) => (
              <article key={hotel.name} className="rounded-card border border-line bg-elev p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium leading-snug">{hotel.name}</h3>
                    <p className="text-xs text-muted">
                      {hotel.rating ? `${hotel.rating.toFixed(1)} / 5` : "Sin calificación"}
                      {hotel.reviews ? ` · ${hotel.reviews} reseñas` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl">{money(hotel.stayTotalMxn)}</p>
                    <p className="text-xs text-muted">{money(hotel.perNightMxn)} / noche</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted">{hotel.source}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {hotel.links.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="press inline-flex min-h-11 items-center rounded-full border border-line px-3 text-sm"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      <ul className="space-y-2 text-xs leading-relaxed text-muted">
        {notices.map((notice) => (
          <li key={notice}>{notice}</li>
        ))}
        {quote.usdMxn ? <li>Tipo de cambio público: 1 USD = {quote.usdMxn.toFixed(2)} MXN.</li> : null}
      </ul>
    </section>
  );
}
