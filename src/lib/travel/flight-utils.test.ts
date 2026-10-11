import test from "node:test";
import assert from "node:assert/strict";
import {
  arrivalOffsetDays,
  cabinBagIncluded,
  findMexicoAirportCode,
  googleFlightsUrl,
  localizeGoogleFlight,
  parseFlightTime,
  type FlightSearchInput,
} from "./flight-utils.ts";

const input: FlightSearchInput = {
  originIata: "MEX",
  checkIn: "2026-11-10",
  checkOut: "2026-11-13",
  adults: 2,
  cabinOnly: true,
  arriveBy14: true,
};

test("free-text Mexican city resolution never treats a city name as an airport code", () => {
  assert.equal(findMexicoAirportCode("Guanajuato"), "BJX");
  assert.equal(findMexicoAirportCode("León"), "BJX");
  assert.equal(findMexicoAirportCode("Puebla"), "PBC");
  assert.equal(findMexicoAirportCode("Nuevo Laredo"), "NLD");
  assert.equal(findMexicoAirportCode("Nuevo"), null);
  assert.equal(findMexicoAirportCode("Paris"), null);
});

test("Google Flights link carries a round-trip filter and MXN currency", () => {
  const url = new URL(googleFlightsUrl(input, "CUN"));
  assert.equal(url.hostname, "www.google.com");
  assert.equal(url.pathname, "/travel/flights");
  assert.ok(url.searchParams.get("tfs"));
  assert.equal(url.searchParams.get("curr"), "MXN");
  assert.equal(url.searchParams.get("hl"), "es");
});

test("flight-time parser accepts 24-hour and AM/PM formats, including the 14:00 boundary", () => {
  assert.equal(parseFlightTime("14:00"), 840);
  assert.equal(parseFlightTime("2:00 PM"), 840);
  assert.equal(parseFlightTime("1:59 PM"), 839);
  assert.equal(parseFlightTime("2:01 PM"), 841);
  assert.equal(parseFlightTime("12:00 AM"), 0);
  assert.equal(parseFlightTime("25:10"), null);
  assert.equal(parseFlightTime("not a time"), null);
});

test("arrival-day markers are conservative when Google changes its wording", () => {
  assert.equal(arrivalOffsetDays(""), 0);
  assert.equal(arrivalOffsetDays("+1 day"), 1);
  assert.equal(arrivalOffsetDays("next day"), 1);
  assert.equal(arrivalOffsetDays("unexpected marker"), 1);
});

test("hand-baggage detector does not mistake a personal item for a carry-on", () => {
  assert.equal(cabinBagIncluded("1 cabin bag included"), true);
  assert.equal(cabinBagIncluded("Carry-on: not included"), false);
  assert.equal(cabinBagIncluded("personal item only"), false);
  assert.equal(cabinBagIncluded("personal item"), null);
  assert.equal(cabinBagIncluded(""), null);
});

test("Google Flights prices can be listed but do not qualify when carry-on is unconfirmed", () => {
  const flight = localizeGoogleFlight(
    {
      is_best: true,
      name: "Volaris",
      departure: "9:00 AM",
      arrival: "1:45 PM",
      arrival_time_ahead: "",
      duration: "2 hr 45 min",
      stops: 0,
      delay: null,
      price: "3,250",
    },
    input,
    "CUN",
    "https://www.google.com/travel/flights",
    "https://www.despegar.com.mx/shop/flights/",
  );
  assert.ok(flight);
  assert.equal(flight.priceMxn, 3250);
  assert.equal(flight.arrivalTime, "13:45");
  assert.equal(flight.arrivesBy14, true);
  assert.equal(flight.cabinIncluded, null);
  assert.equal(flight.qualifies, false);
  assert.match(flight.rejectReason ?? "", /no confirma la maleta/i);
  assert.ok(flight.links.some((link) => link.label === "Aerolínea"));
});

test("next-day Google Flights arrival is rejected even when its clock time is before 14:00", () => {
  const flight = localizeGoogleFlight(
    {
      is_best: true,
      name: "Viva Aerobus",
      departure: "11:00 PM",
      arrival: "1:00 PM",
      arrival_time_ahead: "+1 day",
      duration: "14 hr",
      stops: 1,
      delay: null,
      price: "4,000",
    },
    input,
    "CUN",
    "https://www.google.com/travel/flights",
    "https://www.despegar.com.mx/shop/flights/",
  );
  assert.ok(flight);
  assert.equal(flight.arrivalDate, "2026-11-11");
  assert.equal(flight.sameDay, false);
  assert.equal(flight.arrivesBy14, false);
  assert.equal(flight.qualifies, false);
});
