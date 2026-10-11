import type { Combo, Quote } from "@/lib/travel/types";

/** Everything the search form collects; one object keeps the panel props small. */
export type SearchParams = {
  destinationId: string;
  customCity: string;
  originIata: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  cabinOnly: boolean;
  arriveBy14: boolean;
};

export type Saved = { id: string; quote: Quote; selectedHotelName?: string };

export function quoteId(quote: Quote, selectedHotelName = ""): string {
  return `${quote.place}|${quote.checkIn}|${quote.checkOut}|${quote.adults}|${selectedHotelName}`;
}

export function money(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function comboForHotel(quote: Quote, hotelName: string): Combo | null {
  const hotel = quote.hotels.find((item) => item.name === hotelName) ?? quote.hotels[0];
  if (!hotel) return null;
  const flight = quote.flightMode ? quote.flights[0] : null;
  if (quote.flightMode && !flight) return null;
  const flightMxn = flight?.priceMxn ?? 0;
  const totalMxn = hotel.stayTotalMxn + flightMxn;
  const flightLabel = flight
    ? `${flight.airline}${flight.numbers[0] ? ` ${flight.numbers[0]}` : ""}`
    : null;
  const cabin = flight?.cabinIncluded ?? null;
  const why = flight
    ? `${hotel.name} (${money(hotel.stayTotalMxn)}) más ${flightLabel}, llegada ${flight.arrivalTime}; vuelo ${money(flightMxn)}. ${cabin === true ? "Incluye maleta de mano confirmada." : cabin === false ? "No incluye maleta de mano." : "Verifica la maleta de mano en la aerolínea."} Total ${money(totalMxn)}.`
    : `${hotel.name} es la estancia más baja publicada para esas fechas: ${money(hotel.stayTotalMxn)}. El destino se cotiza sin vuelo.`;
  return {
    hotelName: hotel.name,
    hotelMxn: hotel.stayTotalMxn,
    flightLabel,
    flightMxn,
    totalMxn,
    arrival: flight?.arrivalTime ?? null,
    cabin,
    why,
  };
}

export function savedCombo(item: Saved): Combo | null {
  return comboForHotel(item.quote, item.selectedHotelName ?? item.quote.best?.hotelName ?? "");
}

export function mexicoDate(offsetDays: number): string {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, (day ?? 1) + offsetDays));
  return date.toISOString().slice(0, 10);
}

export function addIsoDays(value: string, offset: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
