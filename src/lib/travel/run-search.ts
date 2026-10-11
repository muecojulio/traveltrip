import { getSql } from "@/lib/db";
import {
  AIRLINE_SITES,
  DESTINATIONS,
  ORIGINS,
  findDestination,
  groundByName,
  needsFlight,
} from "./catalog";
import { parseGoogleHotels } from "./parse-hotels";
import type { Combo, FlightOffer, HotelOffer, Quote, WeatherDay } from "./types";

export type SearchInput = {
  destinationId: string;
  customCity: string;
  originIata: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  cabinOnly: boolean;
  arriveBy14: boolean;
};

const HOSTS = new Set([
  "www.google.com",
  "mcp.octotrip.app",
  "latest.currency-api.pages.dev",
  "api.open-meteo.com",
  "nominatim.openstreetmap.org",
]);

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

type Place = {
  city: string;
  state: string;
  lat: number;
  lon: number;
  iata: string | null;
  flightMode: boolean;
};

function todayMx(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
}

function nightsBetween(a: string, b: string): number {
  const start = Date.parse(`${a}T00:00:00Z`);
  const end = Date.parse(`${b}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

function pesos(value: number): number {
  return Math.round(value);
}

function httpsLink(href: string, hosts: string[]): string | null {
  try {
    const url = new URL(href);
    if (url.protocol !== "https:") return null;
    if (!hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchAllowed(
  url: string,
  init: RequestInit,
  maxBytes: number,
  timeoutMs = 14_000,
): Promise<{ status: number; text: string; finalUrl: string }> {
  const target = new URL(url);
  if (target.protocol !== "https:" || !HOSTS.has(target.hostname)) {
    throw new Error("Fuente no permitida");
  }
  const response = await fetch(target, {
    ...init,
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const finalHost = new URL(response.url).hostname;
  if (!HOSTS.has(finalHost)) throw new Error("La fuente redirigió fuera de la lista permitida");
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > maxBytes) throw new Error("Respuesta demasiado grande");
  return {
    status: response.status,
    text: new TextDecoder().decode(buffer),
    finalUrl: response.url,
  };
}

async function usdMxnRate(): Promise<number | null> {
  try {
    const res = await fetchAllowed(
      "https://latest.currency-api.pages.dev/v1/currencies/usd.min.json",
      { headers: { accept: "application/json" } },
      400_000,
    );
    if (res.status !== 200) return null;
    const data = JSON.parse(res.text) as { usd?: { mxn?: number } };
    const rate = data.usd?.mxn;
    if (typeof rate !== "number" || rate < 8 || rate > 40) return null;
    return rate;
  } catch {
    return null;
  }
}

async function geocode(city: string): Promise<{ lat: number; lon: number } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${city}, Mexico`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  try {
    const res = await fetchAllowed(url.toString(), {
      headers: {
        accept: "application/json",
        "user-agent": "TravelTrip/1.0 (vacation compare; https://github.com/muecojulio/traveltrip)",
      },
    }, 200_000);
    if (res.status !== 200) return null;
    const rows = JSON.parse(res.text) as { lat?: string; lon?: string }[];
    const lat = Number(rows[0]?.lat);
    const lon = Number(rows[0]?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  } catch {
    return null;
  }
}

function weatherLabel(code: number | null): string {
  if (code == null) return "Sin dato";
  if (code === 0) return "Despejado";
  if (code <= 3) return "Nublado parcial";
  if (code <= 48) return "Niebla";
  if (code <= 57) return "Llovizna";
  if (code <= 67) return "Lluvia";
  if (code <= 77) return "Frío";
  if (code <= 82) return "Chubascos";
  if (code >= 95) return "Tormenta";
  return "Variable";
}

async function weather(lat: number, lon: number, checkIn: string, checkOut: string): Promise<WeatherDay[]> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min");
  url.searchParams.set("timezone", "America/Mexico_City");
  url.searchParams.set("start_date", checkIn);
  url.searchParams.set("end_date", checkOut);
  try {
    const res = await fetchAllowed(url.toString(), { headers: { accept: "application/json" } }, 200_000);
    if (res.status !== 200) return [];
    const data = JSON.parse(res.text) as {
      daily?: {
        time?: string[];
        weather_code?: number[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
      };
    };
    const days = data.daily?.time ?? [];
    return days.slice(0, 5).map((date, index) => ({
      date,
      label: weatherLabel(data.daily?.weather_code?.[index] ?? null),
      max: data.daily?.temperature_2m_max?.[index] ?? null,
      min: data.daily?.temperature_2m_min?.[index] ?? null,
    }));
  } catch {
    return [];
  }
}

function cabinIncluded(baggage: string): boolean | null {
  const text = baggage.toLowerCase();
  if (!text) return null;
  if (/no cabin|cabin bag:\s*0|sin maleta de mano|carry-on:\s*0|hand luggage:\s*0/.test(text)) {
    return false;
  }
  if (/cabin bag|carry-on|hand bag|hand luggage|maleta de mano|equipaje de mano/.test(text)) {
    return true;
  }
  return null;
}

function toMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (hours > 23 || mins > 59) return null;
  return hours * 60 + mins;
}

type RawFlight = {
  airline?: string;
  airline_code?: string;
  flight_numbers?: string[];
  price?: number;
  currency?: string;
  baggage?: string;
  booking_url?: string;
  gate?: string;
  is_direct?: boolean;
  stops?: number;
  outbound?: {
    departure?: string;
    arrival?: string;
    departure_time?: string;
    arrival_time?: string;
    departure_date?: string;
    arrival_date?: string;
    duration_minutes?: number;
  };
};

function toMxn(amount: number, currency: string, rate: number | null): number | null {
  const code = currency.toUpperCase();
  if (code === "MXN") return amount;
  if (code === "USD" && rate) return amount * rate;
  return null;
}

async function searchFlights(input: SearchInput, place: Place, rate: number | null): Promise<{
  flights: FlightOffer[];
  others: FlightOffer[];
  hidden: number;
  notice: string | null;
}> {
  if (!place.flightMode || !place.iata) return { flights: [], others: [], hidden: 0, notice: null };
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "search",
      arguments: {
        origin: input.originIata,
        destination: place.iata,
        departure_date: input.checkIn,
        return_date: input.checkOut,
        adults: input.adults,
        currency: "MXN",
        locale: "es",
      },
    },
  };
  let payload: { results?: RawFlight[]; error?: string } | null = null;
  let lastError = "No se pudo consultar el vuelo en vivo. Los enlaces de Despegar y la aerolínea siguen disponibles.";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await fetchAllowed(
        "https://mcp.octotrip.app/flights/mcp",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json, text/event-stream",
            "user-agent": "TravelTrip/1.0 (vacation compare)",
          },
          body: JSON.stringify(body),
        },
        1_500_000,
        22_000,
      );
      if (res.status >= 400) {
        lastError = "La fuente de vuelos no respondió. Usa los enlaces de Despegar y la aerolínea.";
        await new Promise((resolve) => setTimeout(resolve, 1200));
        continue;
      }
      const dataLine = res.text.split("\n").find((line) => line.startsWith("data:"));
      const jsonText = dataLine ? dataLine.slice(5).trim() : res.text;
      const rpc = JSON.parse(jsonText) as {
        result?: { content?: { text?: string }[] };
        error?: { message?: string };
      };
      if (rpc.error) {
        return { flights: [], others: [], hidden: 0, notice: "No hubo tarifas en vivo para esa ruta." };
      }
      const text = rpc.result?.content?.find((item) => item.text)?.text;
      if (!text) {
        lastError = "La fuente de vuelos no devolvió tarifas.";
        continue;
      }
      payload = JSON.parse(text) as { results?: RawFlight[] };
      lastError = "";
      break;
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
      lastError = timedOut
        ? "La consulta de vuelos tardó demasiado. Puedes abrir Despegar y la aerolínea."
        : "No se pudo consultar el vuelo en vivo. Los enlaces de Despegar y la aerolínea siguen disponibles.";
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }
  if (!payload) {
    return { flights: [], others: [], hidden: 0, notice: lastError };
  }

  const despegar = `https://www.despegar.com.mx/shop/flights/results/roundtrip/${input.originIata}/${place.iata}/${input.checkIn}/${input.checkOut}/${input.adults}/0/0`;
  const shown: FlightOffer[] = [];
  const others: FlightOffer[] = [];
  for (const [index, raw] of (payload?.results ?? []).entries()) {
    const outbound = raw.outbound;
    if (!outbound?.arrival_time || !outbound.departure_time || typeof raw.price !== "number" || !raw.airline) {
      continue;
    }
    const priceMxn = toMxn(raw.price, raw.currency ?? "MXN", rate);
    if (priceMxn == null) continue;
    const sameDay = outbound.arrival_date === outbound.departure_date;
    const minutes = toMinutes(outbound.arrival_time);
    const arrivesBy14 = sameDay && minutes != null && minutes <= 14 * 60;
    const cabin = cabinIncluded(raw.baggage ?? "");
    const code = (raw.airline_code ?? "").toUpperCase();
    const airlineSite = AIRLINE_SITES[code] ?? null;
    const live = raw.booking_url ? httpsLink(raw.booking_url, ["mcp.octotrip.app"]) : null;
    const links = [
      live ? { label: "Tarifa en vivo", href: live } : null,
      { label: "Despegar", href: despegar },
      airlineSite ? { label: "Aerolínea", href: airlineSite } : null,
    ].filter((link): link is { label: string; href: string } => Boolean(link));
    const qualifies =
      (!input.arriveBy14 || arrivesBy14) && (!input.cabinOnly || cabin === true);
    const reasons: string[] = [];
    if (input.arriveBy14 && !arrivesBy14) {
      reasons.push(
        sameDay
          ? `Llega a las ${outbound.arrival_time}, después de las 14:00`
          : `Llega a las ${outbound.arrival_time} del día siguiente`,
      );
    }
    if (input.cabinOnly && cabin !== true) {
      reasons.push("La tarifa no confirma maleta de mano");
    }
    const offer: FlightOffer = {
      id: `${code}-${index}-${outbound.departure_time}`,
      airline: raw.airline,
      airlineCode: code,
      numbers: raw.flight_numbers ?? [],
      priceMxn: pesos(priceMxn),
      cabinIncluded: cabin,
      baggage: raw.baggage ?? "",
      arrivalTime: outbound.arrival_time,
      arrivalDate: outbound.arrival_date ?? "",
      departureTime: outbound.departure_time,
      departureAirport: outbound.departure ?? input.originIata,
      arrivalAirport: outbound.arrival ?? place.iata,
      sameDay,
      arrivesBy14,
      direct: Boolean(raw.is_direct) || raw.stops === 0,
      durationMinutes: outbound.duration_minutes ?? null,
      gate: raw.gate ?? "",
      qualifies,
      rejectReason: reasons.length ? reasons.join(". ") : null,
      links,
    };
    if (qualifies) {
      if (shown.length < 8) shown.push(offer);
    } else if (others.length < 6) {
      others.push(offer);
    }
  }
  shown.sort((a, b) => a.priceMxn - b.priceMxn);
  others.sort((a, b) => a.priceMxn - b.priceMxn);
  return { flights: shown, hidden: others.length, notice: null, others };
}

async function searchHotels(
  place: Place,
  input: SearchInput,
  rate: number | null,
): Promise<{ hotels: HotelOffer[]; notice: string | null }> {
  const query = `hoteles en ${place.city}`;
  const url = new URL(`https://www.google.com/travel/hotels/${encodeURIComponent(place.city)}`);
  url.searchParams.set("hl", "es");
  url.searchParams.set("gl", "mx");
  url.searchParams.set("curr", "MXN");
  url.searchParams.set("q", query);
  url.searchParams.set("dates", `${input.checkIn},${input.checkOut}`);
  let parsed: ReturnType<typeof parseGoogleHotels> = [];
  try {
    const res = await fetchAllowed(url.toString(), {
      headers: {
        "user-agent": BROWSER_UA,
        "accept-language": "es-MX,es;q=0.9",
        accept: "text/html",
      },
    }, 4_000_000);
    if (res.status >= 400) {
      return { hotels: [], notice: "Google Hotels no entregó la página de precios." };
    }
    parsed = parseGoogleHotels(res.text);
  } catch {
    return { hotels: [], notice: "No se pudieron leer precios de hotel en este momento. Abre Booking o Despegar con tus fechas." };
  }
  if (parsed.length === 0) {
    return { hotels: [], notice: "La página del destino no traía tarifas legibles. Abre Booking o Despegar para ver el precio allí." };
  }
  const hotels: HotelOffer[] = parsed.map((hotel) => {
    const factor = hotel.currency === "USD" ? rate ?? null : 1;
    const perNightRaw = factor ? hotel.perNight * factor : hotel.perNight;
    const stayRaw = factor ? hotel.stayTotal * factor : hotel.stayTotal;
    const nights = nightsBetween(input.checkIn, input.checkOut);
    const stay = stayRaw < perNightRaw * Math.max(nights - 0.5, 1)
      ? perNightRaw * nights
      : stayRaw;
    const booking = new URL("https://www.booking.com/searchresults.es.html");
    booking.searchParams.set("ss", `${hotel.name} ${place.city}`);
    booking.searchParams.set("checkin", input.checkIn);
    booking.searchParams.set("checkout", input.checkOut);
    booking.searchParams.set("group_adults", String(input.adults));
    booking.searchParams.set("no_rooms", "1");
    booking.searchParams.set("selected_currency", "MXN");
    const despegar = `https://www.despegar.com.mx/hoteles/?q=${encodeURIComponent(`${hotel.name} ${place.city}`)}`;
    const google = hotel.googlePath
      ? httpsLink(`https://www.google.com${hotel.googlePath.startsWith("/") ? "" : "/"}${hotel.googlePath}`, ["www.google.com"])
      : httpsLink(url.toString(), ["www.google.com"]);
    const official = `https://www.google.com/search?q=${encodeURIComponent(`${hotel.name} ${place.city} sitio oficial`)}`;
    return {
      name: hotel.name,
      perNightMxn: pesos(perNightRaw),
      stayTotalMxn: pesos(stay),
      rating: hotel.rating,
      reviews: hotel.reviews,
      source: hotel.currency === "USD" && rate
        ? "Google Hotels, convertido de USD a MXN"
        : "Google Hotels",
      links: [
        { label: "Booking", href: booking.toString() },
        { label: "Despegar", href: despegar },
        google ? { label: "Ofertas", href: google } : { label: "Ofertas", href: url.toString() },
        { label: "Buscar sitio oficial", href: official },
      ],
    };
  });
  hotels.sort((a, b) => a.stayTotalMxn - b.stayTotalMxn);
  if (!rate && parsed.some((hotel) => hotel.currency === "USD")) {
    return {
      hotels,
      notice: "El tipo de cambio no cargó: los precios en dólares se muestran sin convertir.",
    };
  }
  return { hotels, notice: null };
}

function buildCombos(hotels: HotelOffer[], flights: FlightOffer[], flightMode: boolean): {
  best: Combo | null;
  alternatives: Combo[];
} {
  if (hotels.length === 0) return { best: null, alternatives: [] };
  const flight = flightMode ? flights[0] : undefined;
  if (flightMode && !flight) return { best: null, alternatives: [] };
  const combos: Combo[] = hotels.slice(0, 5).map((hotel) => {
    const flightMxn = flight?.priceMxn ?? 0;
    const total = hotel.stayTotalMxn + flightMxn;
    const flightLabel = flight
      ? `${flight.airline} ${flight.numbers[0] ?? ""}`.trim()
      : null;
    return {
      hotelName: hotel.name,
      hotelMxn: hotel.stayTotalMxn,
      flightLabel,
      flightMxn,
      totalMxn: total,
      arrival: flight ? flight.arrivalTime : null,
      cabin: flight ? flight.cabinIncluded : null,
      why: "",
    };
  });
  combos.sort((a, b) => a.totalMxn - b.totalMxn);
  const best = combos[0];
  if (!best) return { best: null, alternatives: [] };
  const next = combos[1];
  if (!flight) {
    best.why = `${best.hotelName} es la estancia más baja publicada para esas fechas: ${money(best.hotelMxn)}. Este destino no lleva vuelo.`;
  } else {
    const cabinText = best.cabin ? "con maleta de mano incluida en la tarifa" : "revisa la maleta de mano en la aerolínea";
    const delta = next ? next.totalMxn - best.totalMxn : 0;
    best.why = next
      ? `Sale más barato ${best.hotelName} (${money(best.hotelMxn)}) más ${best.flightLabel}, que llega a las ${best.arrival} ${cabinText} (${money(best.flightMxn)}). Total ${money(best.totalMxn)}. El siguiente hotel con el mismo vuelo cuesta ${money(delta)} más.`
      : `La combinación más baja es ${best.hotelName} más ${best.flightLabel}, llegada ${best.arrival}, ${cabinText}. Total ${money(best.totalMxn)}.`;
  }
  return { best, alternatives: combos.slice(1, 4) };
}

function money(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

async function resolvePlace(input: SearchInput): Promise<Place> {
  const origin = ORIGINS.find((item) => item.iata === input.originIata);
  if (!origin) throw new Error("Elige un aeropuerto de salida.");
  if (input.destinationId !== "custom") {
    const dest = findDestination(input.destinationId);
    if (!dest) throw new Error("Elige un destino de la lista.");
    return {
      city: dest.city,
      state: dest.state,
      lat: dest.lat,
      lon: dest.lon,
      iata: dest.iata,
      flightMode: needsFlight(dest, origin.iata),
    };
  }
  const city = input.customCity.trim();
  const known = DESTINATIONS.find(
    (dest) => dest.city.toLowerCase() === city.toLowerCase(),
  );
  if (known) {
    return {
      city: known.city,
      state: known.state,
      lat: known.lat,
      lon: known.lon,
      iata: known.iata,
      flightMode: needsFlight(known, origin.iata),
    };
  }
  const geo = await geocode(city);
  const ground = groundByName(city);
  return {
    city,
    state: "México",
    lat: geo?.lat ?? 19.43,
    lon: geo?.lon ?? -99.13,
    iata: ground ? null : city,
    flightMode: !ground,
  };
}

function cacheKey(input: SearchInput, place: Place): string {
  return [
    "v3",
    place.city.toLowerCase(),
    input.originIata,
    input.checkIn,
    input.checkOut,
    input.adults,
    input.cabinOnly ? "1" : "0",
    input.arriveBy14 ? "1" : "0",
    place.flightMode ? "f" : "g",
  ].join("|");
}

async function readCache(key: string): Promise<Quote | null> {
  try {
    const sql = await getSql();
    const rows = await sql<{ payload: string }>`
      select payload from quote_cache
      where cache_key = ${key}
        and fetched_at > now() - interval '15 minutes'
    `;
    const payload = rows[0]?.payload;
    if (!payload) return null;
    const quote = JSON.parse(payload) as Quote;
    return { ...quote, cached: true };
  } catch {
    return null;
  }
}

async function writeCache(key: string, quote: Quote): Promise<void> {
  try {
    const sql = await getSql();
    const payload = JSON.stringify({ ...quote, cached: false });
    await sql`
      insert into quote_cache (cache_key, payload, fetched_at)
      values (${key}, ${payload}, now())
      on conflict (cache_key) do update
        set payload = excluded.payload, fetched_at = now()
    `;
    await sql`
      delete from quote_cache
      where fetched_at < now() - interval '2 days'
    `;
  } catch {
    // Search still works if the cache is down.
  }
}

export async function runSearch(input: SearchInput): Promise<Quote> {
  const today = todayMx();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(input.checkOut)) {
    throw new Error("Fechas inválidas.");
  }
  if (input.checkIn < today) throw new Error("La llegada no puede ser anterior a hoy.");
  const nights = nightsBetween(input.checkIn, input.checkOut);
  if (nights < 1) throw new Error("La salida tiene que ser después de la llegada.");
  if (nights > 14) throw new Error("Por ahora la búsqueda cubre hasta 14 noches.");
  if (input.destinationId === "custom" && input.customCity.trim().length < 3) {
    throw new Error("Escribe la ciudad.");
  }
  if (!ORIGINS.some((origin) => origin.iata === input.originIata)) {
    throw new Error("Elige un aeropuerto de salida.");
  }

  const place = await resolvePlace(input);
  const key = cacheKey(input, place);
  const cached = await readCache(key);
  if (cached) return cached;

  const rate = await usdMxnRate();
  const [hotelResult, flightResult, sky] = await Promise.all([
    searchHotels(place, input, rate),
    searchFlights(input, place, rate),
    weather(place.lat, place.lon, input.checkIn, input.checkOut),
  ]);

  const { best, alternatives } = buildCombos(
    hotelResult.hotels,
    flightResult.flights,
    place.flightMode,
  );
  const origin = ORIGINS.find((item) => item.iata === input.originIata);
  const notices = [hotelResult.notice, flightResult.notice].filter((item): item is string => Boolean(item));
  if (place.flightMode && flightResult.flights.length === 0 && flightResult.others.length > 0) {
    const sample = flightResult.others[0];
    notices.push(
      sample
        ? `La fuente en vivo no trajo una tarifa que llegue antes de las 14:00 con maleta de mano. La más barata publicada es ${sample.airline} a las ${sample.arrivalTime}: ${sample.rejectReason ?? "no cumple la regla"}.`
        : "No hubo una tarifa que cumpla la hora y la maleta de mano.",
    );
  }
  if (place.flightMode) {
    notices.unshift(
      "Cuernavaca, Veracruz y Acapulco van sin vuelo. Este destino sí lo incluye: solo entran tarifas que llegan el mismo día, a más tardar a las 14:00, y con maleta de mano si el interruptor está activo.",
    );
  } else if (
    place.city === "Cuernavaca" ||
    place.city === "Veracruz" ||
    place.city === "Acapulco" ||
    groundByName(place.city)
  ) {
    notices.unshift("Este destino no incluye vuelo. El total es solo la estancia.");
  }
  notices.push(
    "Booking.com y Despegar bloquean la lectura automática de su página. El precio del hotel es el que publica Google Hotels para esas fechas (suele reunir Booking, el sitio del hotel y otras agencias). Los botones abren cada sitio con tus fechas. El vuelo en vivo sale de aerolíneas y agencias; el enlace de tarifa puede ser de afiliado, sin costo extra.",
  );
  if (input.adults !== 2) {
    notices.push("El vuelo usa el número de adultos. La tarjeta de hotel de Google suele calcularse para 2 personas.");
  }

  const bookingCity = new URL("https://www.booking.com/searchresults.es.html");
  bookingCity.searchParams.set("ss", place.city);
  bookingCity.searchParams.set("checkin", input.checkIn);
  bookingCity.searchParams.set("checkout", input.checkOut);
  bookingCity.searchParams.set("group_adults", String(input.adults));
  bookingCity.searchParams.set("no_rooms", "1");
  bookingCity.searchParams.set("selected_currency", "MXN");

  const cityLinks = [
    { label: "Booking", href: bookingCity.toString() },
    { label: "Despegar hoteles", href: `https://www.despegar.com.mx/hoteles/?q=${encodeURIComponent(place.city)}` },
  ];
  if (place.flightMode && place.iata && /^[A-Za-z]{3}$/.test(place.iata)) {
    cityLinks.push({
      label: "Despegar vuelos",
      href: `https://www.despegar.com.mx/shop/flights/results/roundtrip/${input.originIata}/${place.iata}/${input.checkIn}/${input.checkOut}/${input.adults}/0/0`,
    });
  }

  const quote: Quote = {
    place: place.city,
    state: place.state,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights,
    adults: input.adults,
    originLabel: place.flightMode && origin ? `${origin.city} · ${origin.airport}` : null,
    flightMode: place.flightMode,
    hotels: hotelResult.hotels,
    flights: flightResult.flights,
    otherFlights: flightResult.others,
    hiddenFlights: flightResult.hidden,
    best,
    alternatives,
    weather: sky,
    usdMxn: rate,
    notices,
    fetchedAt: new Date().toISOString(),
    cached: false,
    cityLinks,
  };
  if (quote.hotels.length > 0 || quote.flights.length > 0 || quote.otherFlights.length > 0) {
    const flightMissed = quote.flightMode && quote.flights.length === 0 && quote.otherFlights.length === 0;
    if (!flightMissed) await writeCache(key, quote);
  }
  return quote;
}
