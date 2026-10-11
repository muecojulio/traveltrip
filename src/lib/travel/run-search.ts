import { getSql } from "@/lib/db";
import { getFlightsFromFilter } from "google-flights-ts";
import {
  AIRLINE_SITES,
  DESTINATIONS,
  MEXICAN_AIRLINES,
  ORIGINS,
  findDestination,
  groundByName,
  needsFlight,
} from "./catalog";
import {
  airlineCodeFromName,
  airlineUrl,
  cabinBagIncluded,
  findMexicoAirportCode,
  googleFlightsCitySearchUrl,
  googleFlightsFilter,
  googleFlightsUrl,
  localizeGoogleFlight,
  parseFlightTime,
} from "./flight-utils";
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
  groundOnly: boolean;
};

function todayMx(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
}

function nightsBetween(a: string, b: string): number {
  const start = Date.parse(`${a}T00:00:00Z`);
  const end = Date.parse(`${b}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

function isIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
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
  url.searchParams.set("countrycodes", "mx");
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

function despegarFlightUrl(input: SearchInput, destinationIata: string): string {
  return `https://www.despegar.com.mx/shop/flights/results/roundtrip/${input.originIata}/${destinationIata}/${input.checkIn}/${input.checkOut}/${input.adults}/0/0`;
}

function displayFlightTime(value: string): string {
  const minutes = parseFlightTime(value);
  if (minutes == null) return value;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

async function fetchGoogleFlightsPage(url: string, init?: RequestInit): Promise<Response> {
  const target = new URL(url);
  if (target.protocol !== "https:" || target.hostname !== "www.google.com") {
    throw new Error("Google Flights intentó consultar un host no permitido.");
  }
  const response = await fetch(target, {
    ...init,
    redirect: "follow",
    signal: AbortSignal.timeout(12_000),
  });
  const finalHost = new URL(response.url).hostname;
  if (finalHost !== "www.google.com") throw new Error("Google Flights redirigió fuera de su sitio.");
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > 5_000_000) throw new Error("La página de vuelos superó el límite de tamaño.");
  const body = await response.arrayBuffer();
  if (body.byteLength > 5_000_000) throw new Error("La página de vuelos superó el límite de tamaño.");
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

async function searchOctotripFlights(input: SearchInput, place: Place): Promise<RawFlight[]> {
  if (!place.iata) return [];
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
    12_000,
  );
  if (res.status >= 400) throw new Error("OctoTrip no respondió con una tarifa.");
  const dataLines = res.text.split("\n").filter((line) => line.startsWith("data:"));
  const jsonText = dataLines.length ? (dataLines.at(-1) ?? "").slice(5).trim() : res.text;
  const rpc = JSON.parse(jsonText) as {
    result?: { content?: { text?: string }[]; isError?: boolean };
    error?: { message?: string };
  };
  if (rpc.error || rpc.result?.isError) {
    throw new Error(rpc.error?.message ?? "OctoTrip no encontró tarifas.");
  }
  const text = rpc.result?.content?.find((item) => item.text)?.text;
  if (!text) throw new Error("OctoTrip no devolvió una lista de vuelos.");
  const payload = JSON.parse(text) as { results?: RawFlight[]; error?: string };
  if (payload.error) throw new Error(payload.error);
  return payload.results ?? [];
}

async function searchGoogleFlights(input: SearchInput, place: Place): Promise<FlightOffer[]> {
  if (!place.iata) return [];
  const filter = googleFlightsFilter(input, place.iata);
  const [googleLink, despegarLink] = [
    googleFlightsUrl(input, place.iata),
    despegarFlightUrl(input, place.iata),
  ];
  const result = await getFlightsFromFilter(filter, {
    currency: "MXN",
    mode: "common",
    data_source: "html",
    fetchFn: fetchGoogleFlightsPage,
  });
  if (!result || !("flights" in result)) return [];
  return result.flights
    .map((flight) => localizeGoogleFlight(flight, input, place.iata as string, googleLink, despegarLink))
    .filter((flight): flight is FlightOffer => flight !== null);
}

function octotripOffer(
  raw: RawFlight,
  index: number,
  input: SearchInput,
  place: Place,
  rate: number | null,
  googleLink: string,
  despegarLink: string,
): FlightOffer | null {
  const outbound = raw.outbound;
  if (
    !outbound?.arrival_time ||
    !outbound.departure_time ||
    typeof raw.price !== "number" ||
    !raw.airline
  ) {
    return null;
  }
  const priceMxn = toMxn(raw.price, raw.currency ?? "MXN", rate);
  const arrivalMinutes = parseFlightTime(outbound.arrival_time);
  const departureTime = displayFlightTime(outbound.departure_time);
  if (priceMxn == null || arrivalMinutes == null || parseFlightTime(outbound.departure_time) == null) return null;

  const arrivalTime = displayFlightTime(outbound.arrival_time);
  const arrivalDate = outbound.arrival_date ?? "";
  const sameDay = arrivalDate === input.checkIn;
  const arrivesBy14 = sameDay && arrivalMinutes <= 14 * 60;
  const cabin = cabinBagIncluded(raw.baggage ?? "");
  const code = (raw.airline_code ?? airlineCodeFromName(raw.airline)).toUpperCase();
  const airlineSite = airlineUrl(raw.airline, code);
  const live = raw.booking_url ? httpsLink(raw.booking_url, ["mcp.octotrip.app"]) : null;
  const links = [
    live ? { label: "Tarifa en vivo", href: live } : null,
    { label: "Despegar", href: despegarLink },
    airlineSite ? { label: "Aerolínea", href: airlineSite } : null,
    { label: "Google Flights", href: googleLink },
  ].filter((link): link is { label: string; href: string } => Boolean(link));
  const reasons: string[] = [];
  if (input.arriveBy14 && !arrivesBy14) {
    reasons.push(
      !sameDay
        ? arrivalDate
          ? `Llega el ${arrivalDate}, no el día de llegada`
          : "No se confirmó que llegue el día de llegada"
        : `Llega a las ${arrivalTime}, después de las 14:00`,
    );
  }
  if (input.cabinOnly && cabin !== true) {
    reasons.push(cabin === false ? "La tarifa no incluye maleta de mano" : "La tarifa no confirma maleta de mano");
  }
  return {
    id: `${code || "airline"}-${index}-${departureTime}-${arrivalTime}`,
    airline: raw.airline,
    airlineCode: code,
    numbers: raw.flight_numbers ?? [],
    priceMxn: pesos(priceMxn),
    cabinIncluded: cabin,
    baggage: raw.baggage ?? "",
    arrivalTime,
    arrivalDate,
    departureTime,
    departureAirport: outbound.departure ?? input.originIata,
    arrivalAirport: outbound.arrival ?? place.iata ?? place.city,
    sameDay,
    arrivesBy14,
    direct: Boolean(raw.is_direct) || raw.stops === 0,
    durationMinutes: outbound.duration_minutes ?? null,
    gate: raw.gate ?? "",
    source: "OctoTrip",
    qualifies: reasons.length === 0,
    rejectReason: reasons.length ? reasons.join(". ") : null,
    links,
  };
}

function dedupeFlights(flights: FlightOffer[]): FlightOffer[] {
  const unique = new Map<string, FlightOffer>();
  for (const flight of flights) {
    const key = [
      flight.airlineCode || flight.airline.toLowerCase(),
      flight.departureTime,
      flight.arrivalDate,
      flight.arrivalTime,
      flight.priceMxn,
    ].join("|");
    const existing = unique.get(key);
    if (!existing) {
      unique.set(key, flight);
      continue;
    }
    const links = [...existing.links];
    for (const link of flight.links) {
      if (!links.some((saved) => saved.href === link.href)) links.push(link);
    }
    unique.set(key, { ...existing, links });
  }
  return [...unique.values()];
}

async function searchFlights(input: SearchInput, place: Place, rate: number | null): Promise<{
  flights: FlightOffer[];
  others: FlightOffer[];
  hidden: number;
  notice: string | null;
}> {
  if (!place.flightMode) return { flights: [], others: [], hidden: 0, notice: null };
  if (!place.iata) {
    return {
      flights: [],
      others: [],
      hidden: 0,
      notice: `No encontramos un aeropuerto comercial en ${place.city}. Puedes consultar las búsquedas de Google Flights y Despegar, pero no mostraremos un total inventado.`,
    };
  }

  const googleLink = googleFlightsUrl(input, place.iata);
  const despegarLink = despegarFlightUrl(input, place.iata);
  const [octotripResult, googleResult] = await Promise.allSettled([
    searchOctotripFlights(input, place),
    searchGoogleFlights(input, place),
  ]);
  const offers: FlightOffer[] = [];
  const failures: string[] = [];

  if (octotripResult.status === "fulfilled") {
    octotripResult.value.forEach((raw, index) => {
      const offer = octotripOffer(raw, index, input, place, rate, googleLink, despegarLink);
      if (offer) offers.push(offer);
    });
  } else {
    const timedOut =
      octotripResult.reason instanceof Error &&
      ["TimeoutError", "AbortError"].includes(octotripResult.reason.name);
    failures.push(timedOut ? "OctoTrip tardó demasiado" : "OctoTrip no respondió");
  }

  if (googleResult.status === "fulfilled") {
    offers.push(...googleResult.value);
  } else {
    const timedOut =
      googleResult.reason instanceof Error &&
      ["TimeoutError", "AbortError"].includes(googleResult.reason.name);
    failures.push(timedOut ? "Google Flights tardó demasiado" : "Google Flights no respondió");
  }

  const unique = dedupeFlights(offers).sort((a, b) => a.priceMxn - b.priceMxn);
  const qualifying = unique.filter((flight) => flight.qualifies);
  const rejected = unique.filter((flight) => !flight.qualifies);
  const notice =
    unique.length === 0
      ? failures.length
        ? `${failures.join(" y ")}. Los enlaces de búsqueda siguen disponibles para comprobar la tarifa directamente.`
        : "No encontramos tarifas para esta ruta y estas fechas."
      : null;
  return {
    flights: qualifying.slice(0, 8),
    others: rejected.slice(0, 6),
    hidden: Math.max(0, qualifying.length - 8) + Math.max(0, rejected.length - 6),
    notice,
  };
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
  url.searchParams.set("adults", String(input.adults));
  url.searchParams.set("num_adults", String(input.adults));
  const nights = nightsBetween(input.checkIn, input.checkOut);
  let parsed: ReturnType<typeof parseGoogleHotels> = [];
  try {
    const res = await fetchAllowed(
      url.toString(),
      {
        headers: {
          "user-agent": BROWSER_UA,
          "accept-language": "es-MX,es;q=0.9",
          accept: "text/html",
        },
      },
      4_000_000,
    );
    if (res.status >= 400) {
      return { hotels: [], notice: "Google Hotels no entregó la página de precios." };
    }
    parsed = parseGoogleHotels(res.text, nights);
  } catch {
    return {
      hotels: [],
      notice: "No se pudieron leer precios de hotel en este momento. Abre Booking o Despegar con tus fechas.",
    };
  }
  if (parsed.length === 0) {
    return {
      hotels: [],
      notice: "Google Hotels no publicó tarifas legibles para esas fechas. Abre Booking o Despegar para consultar disponibilidad.",
    };
  }

  const skippedUsd = !rate && parsed.some((hotel) => hotel.currency === "USD");
  const usable = parsed.filter((hotel) => hotel.currency !== "USD" || rate !== null);
  if (usable.length === 0) {
    return {
      hotels: [],
      notice: "Google Hotels devolvió precios en USD y no se pudo consultar el tipo de cambio; no mostramos un total MXN incorrecto.",
    };
  }

  const hotels: HotelOffer[] = usable.map((hotel) => {
    const factor = hotel.currency === "USD" ? rate as number : 1;
    const perNightMxn = hotel.perNight * factor;
    const stayTotalMxn = hotel.stayTotal * factor;
    const booking = new URL("https://www.booking.com/searchresults.es.html");
    booking.searchParams.set("ss", `${hotel.name} ${place.city}`);
    booking.searchParams.set("checkin", input.checkIn);
    booking.searchParams.set("checkout", input.checkOut);
    booking.searchParams.set("group_adults", String(input.adults));
    booking.searchParams.set("no_rooms", "1");
    booking.searchParams.set("selected_currency", "MXN");

    const despegar = new URL("https://www.despegar.com.mx/hoteles/");
    despegar.searchParams.set("q", `${hotel.name} ${place.city}`);
    despegar.searchParams.set("checkin", input.checkIn);
    despegar.searchParams.set("checkout", input.checkOut);
    despegar.searchParams.set("adults", String(input.adults));

    const google = hotel.googlePath
      ? httpsLink(
          `https://www.google.com${hotel.googlePath.startsWith("/") ? "" : "/"}${hotel.googlePath}`,
          ["www.google.com"],
        )
      : httpsLink(url.toString(), ["www.google.com"]);
    const official = new URL("https://www.google.com/search");
    official.searchParams.set("q", `${hotel.name} ${place.city} hotel sitio oficial`);
    return {
      name: hotel.name,
      perNightMxn: pesos(perNightMxn),
      stayTotalMxn: pesos(stayTotalMxn),
      rating: hotel.rating,
      reviews: hotel.reviews,
      source: [
        "Google Hotels",
        hotel.hasStayTotal ? "total publicado" : `estimado: ${nights} × precio por noche`,
        hotel.currency === "USD" ? "USD convertido a MXN" : "MXN",
      ].join(" · "),
      links: [
        { label: "Booking", href: booking.toString() },
        { label: "Despegar", href: despegar.toString() },
        google ? { label: "Google Hotels", href: google } : { label: "Google Hotels", href: url.toString() },
        { label: "Buscar sitio oficial", href: official.toString() },
      ],
    };
  });
  hotels.sort((a, b) => a.stayTotalMxn - b.stayTotalMxn);
  return {
    hotels,
    notice: skippedUsd
      ? "Algunos precios USD se omitieron porque no cargó el tipo de cambio público; no se mezclan dólares con pesos."
      : null,
  };
}

function buildCombos(
  hotels: HotelOffer[],
  flights: FlightOffer[],
  place: Pick<Place, "flightMode" | "groundOnly">,
): {
  best: Combo | null;
  alternatives: Combo[];
} {
  if (hotels.length === 0) return { best: null, alternatives: [] };
  const flight = place.flightMode ? flights[0] : undefined;
  if (place.flightMode && !flight) return { best: null, alternatives: [] };
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
    const flightReason = place.groundOnly
      ? "Cuernavaca, Veracruz y Acapulco se cotizan sin vuelo."
      : "No se suma vuelo porque el origen ya está en la zona del destino.";
    best.why = `${best.hotelName} es la estancia más baja publicada para esas fechas: ${money(best.hotelMxn)}. ${flightReason}`;
  } else {
    const cabinText =
      best.cabin === true
        ? "con maleta de mano incluida en la tarifa"
        : best.cabin === false
          ? "sin maleta de mano incluida"
          : "con equipaje de mano por confirmar en la aerolínea";
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
      groundOnly: dest.groundOnly,
    };
  }

  const city = input.customCity.trim();
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const known = DESTINATIONS.find((dest) => normalize(dest.city) === normalize(city));
  if (known) {
    return {
      city: known.city,
      state: known.state,
      lat: known.lat,
      lon: known.lon,
      iata: known.iata,
      flightMode: needsFlight(known, origin.iata),
      groundOnly: known.groundOnly,
    };
  }

  const ground = groundByName(city);
  const geo = await geocode(city);
  if (!geo) throw new Error(`No pudimos ubicar ${city} en México. Revisa el nombre del destino.`);
  return {
    city,
    state: "México",
    lat: geo.lat,
    lon: geo.lon,
    iata: ground ? null : findMexicoAirportCode(city),
    flightMode: !ground,
    groundOnly: ground,
  };
}

function cacheKey(input: SearchInput, place: Place): string {
  return [
    "v4",
    place.city.toLowerCase(),
    place.iata ?? "no-airport",
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
        and fetched_at > now() - interval '5 minutes'
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
  if (!isIsoCalendarDate(input.checkIn) || !isIsoCalendarDate(input.checkOut)) {
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

  const { best, alternatives } = buildCombos(hotelResult.hotels, flightResult.flights, place);
  const origin = ORIGINS.find((item) => item.iata === input.originIata);
  const notices = [hotelResult.notice, flightResult.notice].filter((item): item is string => Boolean(item));
  if (place.groundOnly) {
    notices.unshift("Cuernavaca, Veracruz y Acapulco se cotizan sin vuelo; el total es solo hotel.");
  } else if (!place.flightMode) {
    notices.unshift("No se suma vuelo porque sales desde la misma zona aeroportuaria del destino.");
  } else if (flightResult.flights.length === 0 && flightResult.others.length > 0) {
    const sample = flightResult.others[0];
    notices.push(
      `No hay una tarifa que cumpla todos los filtros activos. La más barata publicada es ${sample.airline} a las ${sample.arrivalTime}: ${sample.rejectReason ?? "revisa el equipaje y la hora"}.`,
    );
  } else if (flightResult.hidden > 0) {
    notices.push(`${flightResult.hidden} tarifas adicionales no se muestran para mantener la lista breve.`);
  }
  notices.push(
    "El precio de hotel se lee de Google Hotels; Booking y Despegar se abren con tus fechas porque no ofrecen una lectura pública fiable de sus tarifas desde esta app. Los importes son orientativos: confirma impuestos, disponibilidad y precio final en el sitio antes de reservar.",
  );
  if (place.flightMode) {
    notices.push(
      "El vuelo es de ida y vuelta para el grupo seleccionado. La maleta de mano solo se cuenta como incluida cuando la fuente lo confirma; los resultados de Google Flights pueden requerir verificación de tarifa en la aerolínea.",
    );
  }
  if (input.adults !== 2) {
    notices.push(
      "Se envió el número de adultos elegido a las búsquedas; verifica la ocupación y el total final en la página del hotel.",
    );
  }

  const bookingCity = new URL("https://www.booking.com/searchresults.es.html");
  bookingCity.searchParams.set("ss", place.city);
  bookingCity.searchParams.set("checkin", input.checkIn);
  bookingCity.searchParams.set("checkout", input.checkOut);
  bookingCity.searchParams.set("group_adults", String(input.adults));
  bookingCity.searchParams.set("no_rooms", "1");
  bookingCity.searchParams.set("selected_currency", "MXN");

  const despegarHotel = new URL("https://www.despegar.com.mx/hoteles/");
  despegarHotel.searchParams.set("q", place.city);
  despegarHotel.searchParams.set("checkin", input.checkIn);
  despegarHotel.searchParams.set("checkout", input.checkOut);
  despegarHotel.searchParams.set("adults", String(input.adults));
  const cityLinks: { label: string; href: string }[] = [
    { label: "Booking hoteles", href: bookingCity.toString() },
    { label: "Despegar hoteles", href: despegarHotel.toString() },
  ];
  if (place.flightMode) {
    cityLinks.push(
      place.iata
        ? { label: "Google Flights", href: googleFlightsUrl(input, place.iata) }
        : { label: "Buscar vuelos", href: googleFlightsCitySearchUrl(input, place.city) },
    );
    if (place.iata) {
      cityLinks.push({ label: "Despegar vuelos", href: despegarFlightUrl(input, place.iata) });
    } else {
      const despegarSearch = new URL("https://www.despegar.com.mx/shop/flights/");
      despegarSearch.searchParams.set("q", `${input.originIata} ${place.city} ${input.checkIn}`);
      cityLinks.push({ label: "Buscar vuelos en Despegar", href: despegarSearch.toString() });
    }
    for (const airline of MEXICAN_AIRLINES) {
      const href = AIRLINE_SITES[airline.code];
      if (href) cityLinks.push({ label: airline.label, href });
    }
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
