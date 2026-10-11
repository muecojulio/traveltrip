export type Destination = {
  id: string;
  city: string;
  state: string;
  blurb: string;
  lat: number;
  lon: number;
  iata: string | null;
  /** Cuernavaca, Veracruz and Acapulco never include a flight. */
  groundOnly: boolean;
};

export type Origin = {
  iata: string;
  city: string;
  airport: string;
};

export const ORIGINS: Origin[] = [
  { iata: "MEX", city: "Ciudad de México", airport: "AICM" },
  { iata: "NLU", city: "Ciudad de México", airport: "AIFA" },
  { iata: "TLC", city: "Toluca", airport: "Toluca" },
];

export const DESTINATIONS: Destination[] = [
  {
    id: "cuernavaca",
    city: "Cuernavaca",
    state: "Morelos",
    blurb: "Ciudad de la eterna primavera",
    lat: 18.9242,
    lon: -99.2216,
    iata: null,
    groundOnly: true,
  },
  {
    id: "veracruz",
    city: "Veracruz",
    state: "Veracruz",
    blurb: "Puerto, malecón y mariscos",
    lat: 19.1738,
    lon: -96.1342,
    iata: null,
    groundOnly: true,
  },
  {
    id: "acapulco",
    city: "Acapulco",
    state: "Guerrero",
    blurb: "Bahía y atardecer",
    lat: 16.8531,
    lon: -99.8237,
    iata: null,
    groundOnly: true,
  },
  {
    id: "cancun",
    city: "Cancún",
    state: "Quintana Roo",
    blurb: "Caribe y mar abierto",
    lat: 21.1619,
    lon: -86.8515,
    iata: "CUN",
    groundOnly: false,
  },
  {
    id: "tulum",
    city: "Tulum",
    state: "Quintana Roo",
    blurb: "Selva y costa",
    lat: 20.2114,
    lon: -87.4654,
    iata: "TQO",
    groundOnly: false,
  },
  {
    id: "vallarta",
    city: "Puerto Vallarta",
    state: "Jalisco",
    blurb: "Bahía de Banderas",
    lat: 20.6534,
    lon: -105.2253,
    iata: "PVR",
    groundOnly: false,
  },
  {
    id: "cabos",
    city: "Los Cabos",
    state: "Baja California Sur",
    blurb: "Desierto y mar de Cortés",
    lat: 23.0594,
    lon: -109.702,
    iata: "SJD",
    groundOnly: false,
  },
  {
    id: "huatulco",
    city: "Huatulco",
    state: "Oaxaca",
    blurb: "Bahías del Pacífico",
    lat: 15.7691,
    lon: -96.259,
    iata: "HUX",
    groundOnly: false,
  },
  {
    id: "oaxaca",
    city: "Oaxaca",
    state: "Oaxaca",
    blurb: "Ciudad, mercados y valles",
    lat: 17.0732,
    lon: -96.7266,
    iata: "OAX",
    groundOnly: false,
  },
  {
    id: "merida",
    city: "Mérida",
    state: "Yucatán",
    blurb: "Ciudad blanca",
    lat: 20.9674,
    lon: -89.5926,
    iata: "MID",
    groundOnly: false,
  },
  {
    id: "mazatlan",
    city: "Mazatlán",
    state: "Sinaloa",
    blurb: "Malecón del Pacífico",
    lat: 23.2494,
    lon: -106.4111,
    iata: "MZT",
    groundOnly: false,
  },
  {
    id: "guadalajara",
    city: "Guadalajara",
    state: "Jalisco",
    blurb: "Centro y tequila",
    lat: 20.6597,
    lon: -103.3496,
    iata: "GDL",
    groundOnly: false,
  },
  {
    id: "monterrey",
    city: "Monterrey",
    state: "Nuevo León",
    blurb: "Sierra y ciudad",
    lat: 25.6866,
    lon: -100.3161,
    iata: "MTY",
    groundOnly: false,
  },
  {
    id: "cdmx",
    city: "Ciudad de México",
    state: "CDMX",
    blurb: "Capital",
    lat: 19.4326,
    lon: -99.1332,
    iata: "MEX",
    groundOnly: false,
  },
];

const METRO_CDMX = new Set(["MEX", "NLU", "TLC"]);

export function findDestination(id: string): Destination | undefined {
  return DESTINATIONS.find((d) => d.id === id);
}

export function needsFlight(dest: Destination, originIata: string): boolean {
  if (dest.groundOnly || !dest.iata) return false;
  if (METRO_CDMX.has(dest.iata) && METRO_CDMX.has(originIata)) return false;
  if (dest.iata === originIata) return false;
  return true;
}

export function groundByName(city: string): boolean {
  const n = city
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  return n === "cuernavaca" || n === "veracruz" || n === "acapulco";
}

export const AIRLINE_SITES: Record<string, string> = {
  VB: "https://www.vivaaerobus.com/es-mx",
  Y4: "https://www.volaris.com/",
  AM: "https://aeromexico.com/es-mx",
  AA: "https://www.aa.com/",
  UA: "https://www.united.com/",
  DL: "https://www.delta.com/",
  CM: "https://www.copaair.com/",
  AV: "https://www.avianca.com/",
  LA: "https://www.latam.com/",
  IB: "https://www.iberia.com/",
  AF: "https://www.airfrance.com/",
  KL: "https://www.klm.com/",
  LH: "https://www.lufthansa.com/",
  BA: "https://www.britishairways.com/",
  B6: "https://www.jetblue.com/",
  NK: "https://www.spirit.com/",
  F9: "https://www.flyfrontier.com/",
  WN: "https://www.southwest.com/",
  AS: "https://www.alaskaair.com/",
};
