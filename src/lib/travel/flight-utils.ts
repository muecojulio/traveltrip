import {
  createFilter,
  FlightData,
  Passengers,
  searchAirport,
  type Flight as GoogleFlight,
} from "google-flights-ts";
import { AIRLINE_SITES, MEXICO_AIRPORT_CODES } from "./catalog.ts";
import { addIsoDays } from "./format.ts";
import { sanitizePlainText } from "./security.ts";
import type { FlightOffer } from "./types.ts";

export type FlightSearchInput = {
  originIata: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  cabinOnly: boolean;
  arriveBy14: boolean;
};

const MEXICO_CITY_ALIASES: Record<string, string> = {
  aguascalientes: "AGU",
  campeche: "CPE",
  chihuahua: "CUU",
  cozumel: "CZM",
  culiacan: "CUL",
  guanajuato: "BJX",
  leon: "BJX",
  "leon guanajuato": "BJX",
  "la paz": "LAP",
  "los mochis": "LMM",
  manzanillo: "ZLO",
  matamoros: "MAM",
  mexicali: "MXL",
  "nuevo laredo": "NLD",
  puebla: "PBC",
  "puerto escondido": "PXM",
  "san luis potosi": "SLP",
  tapachula: "TAP",
  tepic: "TPQ",
  tijuana: "TIJ",
  torreon: "TRC",
  tuxtla: "TGZ",
  "tuxtla gutierrez": "TGZ",
  villahermosa: "VSA",
  zacatecas: "ZCL",
};

function normalizeCity(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Resolve a free-text city to a Mexican airport, never to a made-up IATA code. */
export function findMexicoAirportCode(city: string): string | null {
  const normalized = normalizeCity(city);
  const alias = MEXICO_CITY_ALIASES[normalized];
  if (alias) return alias;

  // google-flights-ts ships an MIT-licensed airport-name/IATA catalog. Its
  // search helper matches airport names; normalize spaces to its underscore
  // convention and only accept codes in our Mexico allow-list.
  const query = normalized.replace(/\s+/g, "_");
  const match = searchAirport(query).find(({ code }) => MEXICO_AIRPORT_CODES.has(code));
  return match?.code ?? null;
}

/** Build the Google Flights route filter for the selected dates and adults. */
export function googleFlightsFilter(input: FlightSearchInput, destinationIata: string) {
  return createFilter({
    flight_data: [
      new FlightData({
        date: input.checkIn,
        from_airport: input.originIata,
        to_airport: destinationIata,
      }),
      new FlightData({
        date: input.checkOut,
        from_airport: destinationIata,
        to_airport: input.originIata,
      }),
    ],
    trip: "round-trip",
    passengers: new Passengers({ adults: input.adults }),
    seat: "economy",
  });
}

/** Build a direct Google Flights search URL with the selected dates and adults. */
export function googleFlightsUrl(input: FlightSearchInput, destinationIata: string): string {
  const filter = googleFlightsFilter(input, destinationIata);
  const url = new URL("https://www.google.com/travel/flights");
  url.searchParams.set("tfs", filter.toBase64());
  url.searchParams.set("hl", "es");
  url.searchParams.set("curr", "MXN");
  url.searchParams.set("tfu", "EgQIABABIgA");
  return url.toString();
}

export function googleFlightsCitySearchUrl(
  input: FlightSearchInput,
  destination: string,
): string {
  const query = `vuelos de ${input.originIata} a ${destination} ${input.checkIn} al ${input.checkOut} ${input.adults} adultos`;
  const url = new URL("https://www.google.com/search");
  url.searchParams.set("q", query);
  return url.toString();
}

export function parseFlightTime(value: string): number | null {
  const match = /\b(\d{1,2}):(\d{2})\s*(AM|PM)?\b/i.exec(value.trim());
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const suffix = match[3]?.toUpperCase();
  if (hours > 23 || minutes > 59) return null;
  if (suffix) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (suffix === "PM" ? 12 : 0);
  }
  return hours * 60 + minutes;
}

export function arrivalOffsetDays(value: string): number {
  const text = value.trim().toLowerCase();
  if (!text) return 0;
  if (/same day|mismo d[ií]a/.test(text)) return 0;
  const plus = /\+\s*(\d+)/.exec(text);
  if (plus) return Math.max(1, Math.min(7, Number(plus[1])));
  if (/next day|tomorrow|siguiente d[ií]a|d[ií]a siguiente|\bday\b/.test(text)) return 1;
  // A non-empty Google "time ahead" marker that is not understood is not safe
  // to assume same-day; keep it outside the <= 14:00 shortlist.
  return 1;
}

export function cabinBagIncluded(description: string): boolean | null {
  const text = description
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (!text.trim()) return null;

  if (
    /(?:no|sin|0|zero|not included|excluded|does not include)[^.!;]{0,35}(?:cabin bag|carry[ -]?on|hand luggage|maleta de mano|equipaje de mano)/.test(
      text,
    ) ||
    /(?:cabin bag|carry[ -]?on|hand luggage|maleta de mano|equipaje de mano)\s*[:=]?\s*(?:0|none|not included|excluded|no)/.test(
      text,
    ) ||
    /personal item only|solo articulo personal|solo articulo de mano/.test(text)
  ) {
    return false;
  }

  if (
    /cabin bag|carry[ -]?on|hand luggage|maleta de mano|equipaje de mano|overhead bag/.test(text)
  ) {
    return true;
  }
  return null;
}

export function airlineCodeFromName(name: string): string {
  const normalized = normalizeCity(name);
  if (/volaris/.test(normalized)) return "Y4";
  if (/viva aerobus|viva aerob[uú]s|\bviva\b/.test(normalized)) return "VB";
  if (/aeromexico|aerom[eé]xico/.test(normalized)) return "AM";
  if (/united/.test(normalized)) return "UA";
  if (/american/.test(normalized)) return "AA";
  if (/delta/.test(normalized)) return "DL";
  if (/copa/.test(normalized)) return "CM";
  if (/avianca/.test(normalized)) return "AV";
  if (/latam/.test(normalized)) return "LA";
  if (/iberia/.test(normalized)) return "IB";
  if (/air france/.test(normalized)) return "AF";
  if (/klm/.test(normalized)) return "KL";
  if (/lufthansa/.test(normalized)) return "LH";
  if (/british airways/.test(normalized)) return "BA";
  if (/jetblue/.test(normalized)) return "B6";
  if (/spirit/.test(normalized)) return "NK";
  if (/frontier/.test(normalized)) return "F9";
  if (/southwest/.test(normalized)) return "WN";
  if (/alaska/.test(normalized)) return "AS";
  return "";
}

export function airlineUrl(airlineName: string, airlineCode = ""): string | null {
  const code = airlineCode.toUpperCase() || airlineCodeFromName(airlineName);
  return AIRLINE_SITES[code] ?? null;
}

export function localizeGoogleFlight(
  flight: GoogleFlight,
  input: FlightSearchInput,
  destinationIata: string,
  googleLink: string,
  despegarLink: string,
): FlightOffer | null {
  const priceMxn = parsePositivePrice(flight.price);
  const arrivalMinutes = parseFlightTime(flight.arrival);
  const departureMinutes = parseFlightTime(flight.departure);
  const airlineName = sanitizePlainText(flight.name ?? "", 80);
  if (priceMxn == null || arrivalMinutes == null || departureMinutes == null || !airlineName) {
    return null;
  }
  const arrivalTime = formatTime(arrivalMinutes);
  const departureTime = formatTime(departureMinutes);
  const offsetDays = arrivalOffsetDays(flight.arrival_time_ahead);
  const arrivalDate = addIsoDays(input.checkIn, offsetDays);
  const sameDay = offsetDays === 0;
  const arrivesBy14 = sameDay && arrivalMinutes <= 14 * 60;
  const code = airlineCodeFromName(airlineName);
  const official = airlineUrl(airlineName, code);
  const links = [
    { label: "Google Flights", href: googleLink },
    { label: "Despegar", href: despegarLink },
    official ? { label: "Aerolínea", href: official } : null,
  ].filter((link): link is { label: string; href: string } => Boolean(link));
  const reasons: string[] = [];
  if (input.arriveBy14 && !arrivesBy14) {
    reasons.push(
      sameDay
        ? `Llega a las ${arrivalTime}, después de las 14:00`
        : `Llega el ${arrivalDate}, después de la salida`,
    );
  }
  if (input.cabinOnly) reasons.push("Google Flights no confirma la maleta de mano para esta tarifa");
  return {
    id: `google-${code || normalizeCity(airlineName)}-${departureTime}-${arrivalTime}-${priceMxn}`,
    airline: airlineName,
    airlineCode: code,
    numbers: [],
    priceMxn,
    cabinIncluded: null,
    baggage: "Google Flights no confirma el equipaje de mano de la tarifa base.",
    arrivalTime,
    arrivalDate,
    departureTime,
    departureAirport: input.originIata,
    arrivalAirport: destinationIata,
    sameDay,
    arrivesBy14,
    direct: flight.stops === 0,
    durationMinutes: null,
    gate: "Google Flights",
    source: "Google Flights",
    qualifies: reasons.length === 0,
    rejectReason: reasons.length > 0 ? reasons.join(". ") : null,
    links,
  };
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function parsePositivePrice(value: string): number | null {
  const digits = value.replace(/[^\d.,]/g, "");
  if (!digits) return null;
  let normalized = digits;
  const comma = digits.lastIndexOf(",");
  const dot = digits.lastIndexOf(".");
  if (comma > dot) {
    const decimals = digits.length - comma - 1;
    normalized = decimals === 2 ? digits.replace(/\./g, "").replace(",", ".") : digits.replace(/,/g, "");
  } else if (dot > comma && comma >= 0) {
    normalized = digits.replace(/,/g, "");
  } else if (comma >= 0) {
    const decimals = digits.length - comma - 1;
    normalized = decimals === 2 ? digits.replace(/,/g, ".") : digits.replace(/,/g, "");
  }
  const price = Number(normalized);
  return Number.isFinite(price) && price > 0 && price <= 500_000 ? Math.round(price) : null;
}
