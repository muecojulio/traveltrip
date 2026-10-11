export type DestinationRegion = "playa" | "cultura" | "escapada" | "ciudades";
export type DestinationScenery =
  | "caribe"
  | "pacifico"
  | "colonial"
  | "desierto"
  | "selva"
  | "metropoli";

export type Destination = {
  id: string;
  city: string;
  state: string;
  blurb: string;
  lat: number;
  lon: number;
  iata: string | null;
  /** Cuernavaca, Veracruz and Acapulco are the only no-flight destinations. */
  groundOnly: boolean;
  region: DestinationRegion;
  scenery: DestinationScenery;
  avgTempC: number;
  highlights: string[];
};

export type Origin = {
  iata: string;
  city: string;
  airport: string;
};

export type QuickEscape = {
  id: string;
  title: string;
  subtitle: string;
  destinationId: string;
  nights: number;
  badge: string;
};

export const DESTINATION_REGIONS: {
  id: "todos" | DestinationRegion;
  label: string;
}[] = [
  { id: "todos", label: "Todos" },
  { id: "playa", label: "Playas y Mar" },
  { id: "cultura", label: "Pueblos y Cultura" },
  { id: "escapada", label: "Sin Vuelo" },
  { id: "ciudades", label: "Ciudades y Norte" },
];

export const QUICK_ESCAPES: QuickEscape[] = [
  {
    id: "escape-cuernavaca",
    title: "Fin de semana en Cuernavaca",
    subtitle: "2 noches · Sin vuelo · Jardines y alberca",
    destinationId: "cuernavaca",
    nights: 2,
    badge: "Escapada rápida",
  },
  {
    id: "escape-cancun",
    title: "Caribe Turquesa en Cancún",
    subtitle: "4 noches · Vuelo < 2 pm · Mar y arrecifes",
    destinationId: "cancun",
    nights: 4,
    badge: "Favorito playa",
  },
  {
    id: "escape-oaxaca",
    title: "Ruta Gastronómica en Oaxaca",
    subtitle: "3 noches · Mercados, mezcal y Monte Albán",
    destinationId: "oaxaca",
    nights: 3,
    badge: "Cultura viva",
  },
  {
    id: "escape-escondido",
    title: "Olas y Atardecer en Pto. Escondido",
    subtitle: "4 noches · Zicatela y Mazunte",
    destinationId: "puerto-escondido",
    nights: 4,
    badge: "Costa oaxaqueña",
  },
  {
    id: "escape-merida",
    title: "Haciendas y Cenotes en Mérida",
    subtitle: "3 noches · Paseo de Montejo y cochinita",
    destinationId: "merida",
    nights: 3,
    badge: "Joya maya",
  },
];

export const ORIGINS: Origin[] = [
  { iata: "MEX", city: "Ciudad de México", airport: "AICM" },
  { iata: "NLU", city: "Ciudad de México", airport: "AIFA" },
  { iata: "TLC", city: "Toluca", airport: "Toluca" },
  { iata: "GDL", city: "Guadalajara", airport: "Miguel Hidalgo" },
  { iata: "MTY", city: "Monterrey", airport: "Mariano Escobedo" },
  { iata: "BJX", city: "León / Guanajuato", airport: "Del Bajío" },
  { iata: "QRO", city: "Querétaro", airport: "Querétaro" },
  { iata: "TIJ", city: "Tijuana", airport: "Tijuana" },
  { iata: "CUN", city: "Cancún", airport: "Cancún" },
  { iata: "MID", city: "Mérida", airport: "Mérida" },
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
    region: "escapada",
    scenery: "selva",
    avgTempC: 26,
    highlights: ["Jardín Borda", "Palacio de Cortés", "Tepoztlán cerca"],
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
    region: "escapada",
    scenery: "caribe",
    avgTempC: 29,
    highlights: ["Malecón", "San Juan de Ulúa", "Café de La Parroquia"],
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
    region: "escapada",
    scenery: "pacifico",
    avgTempC: 30,
    highlights: ["La Quebrada", "Bahía de Santa Lucía", "Pie de la Cuesta"],
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
    region: "playa",
    scenery: "caribe",
    avgTempC: 29,
    highlights: ["Playa Delfines", "Isla Mujeres", "Laguna Nichupté"],
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
    region: "playa",
    scenery: "selva",
    avgTempC: 29,
    highlights: ["Zona Arqueológica", "Gran Cenote", "Sian Ka'an"],
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
    region: "playa",
    scenery: "pacifico",
    avgTempC: 28,
    highlights: ["Malecón Escultórico", "Zona Romántica", "Los Arcos"],
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
    region: "playa",
    scenery: "desierto",
    avgTempC: 27,
    highlights: ["El Arco", "Playa del Amor", "San José del Cabo"],
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
    region: "playa",
    scenery: "pacifico",
    avgTempC: 30,
    highlights: ["9 Bahías", "La Entrega", "Parque Nacional"],
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
    region: "cultura",
    scenery: "colonial",
    avgTempC: 25,
    highlights: ["Santo Domingo", "Monte Albán", "Hierve el Agua"],
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
    region: "cultura",
    scenery: "colonial",
    avgTempC: 31,
    highlights: ["Paseo de Montejo", "Uxmal", "Cenotes de Homún"],
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
    region: "playa",
    scenery: "pacifico",
    avgTempC: 28,
    highlights: ["Centro Histórico", "Isla de la Piedra", "El Faro"],
  },
  {
    id: "ixtapa",
    city: "Ixtapa-Zihuatanejo",
    state: "Guerrero",
    blurb: "Playas del Pacífico",
    lat: 17.645,
    lon: -101.552,
    iata: "ZIH",
    groundOnly: false,
    region: "playa",
    scenery: "pacifico",
    avgTempC: 29,
    highlights: ["Playa La Ropa", "Isla Ixtapa", "Paseo del Pescador"],
  },
  {
    id: "puerto-escondido",
    city: "Puerto Escondido",
    state: "Oaxaca",
    blurb: "Surf y costa oaxaqueña",
    lat: 15.8719,
    lon: -97.0767,
    iata: "PXM",
    groundOnly: false,
    region: "playa",
    scenery: "pacifico",
    avgTempC: 30,
    highlights: ["Carrizalillo", "Zicatela", "Laguna Manialtepec"],
  },
  {
    id: "cozumel",
    city: "Cozumel",
    state: "Quintana Roo",
    blurb: "Arrecifes y buceo",
    lat: 20.4318,
    lon: -86.9223,
    iata: "CZM",
    groundOnly: false,
    region: "playa",
    scenery: "caribe",
    avgTempC: 28,
    highlights: ["Arrecife Palancar", "El Cielo", "Punta Sur"],
  },
  {
    id: "la-paz",
    city: "La Paz",
    state: "Baja California Sur",
    blurb: "Mar de Cortés",
    lat: 24.1426,
    lon: -110.3128,
    iata: "LAP",
    groundOnly: false,
    region: "playa",
    scenery: "desierto",
    avgTempC: 27,
    highlights: ["Playa Balandra", "Isla Espíritu Santo", "Malecón"],
  },
  {
    id: "guanajuato",
    city: "León / Guanajuato",
    state: "Guanajuato",
    blurb: "Ciudad colonial y viñedos",
    lat: 21.1221,
    lon: -101.686,
    iata: "BJX",
    groundOnly: false,
    region: "cultura",
    scenery: "colonial",
    avgTempC: 23,
    highlights: ["Teatro Juárez", "Callejón del Beso", "San Miguel cerca"],
  },
  {
    id: "puebla",
    city: "Puebla",
    state: "Puebla",
    blurb: "Talavera, volcanes y cocina",
    lat: 19.0414,
    lon: -98.2063,
    iata: "PBC",
    groundOnly: false,
    region: "cultura",
    scenery: "colonial",
    avgTempC: 22,
    highlights: ["Capilla del Rosario", "Cholula", "Callejón de los Sapos"],
  },
  {
    id: "queretaro",
    city: "Querétaro",
    state: "Querétaro",
    blurb: "Centro histórico y viñedos",
    lat: 20.5888,
    lon: -100.3899,
    iata: "QRO",
    groundOnly: false,
    region: "cultura",
    scenery: "colonial",
    avgTempC: 24,
    highlights: ["Los Arcos", "Peña de Bernal", "Ruta del Queso y Vino"],
  },
  {
    id: "campeche",
    city: "Campeche",
    state: "Campeche",
    blurb: "Murallas y costa",
    lat: 19.8301,
    lon: -90.5349,
    iata: "CPE",
    groundOnly: false,
    region: "cultura",
    scenery: "colonial",
    avgTempC: 30,
    highlights: ["Recinto Amurallado", "Edzná", "Calle 59"],
  },
  {
    id: "chihuahua",
    city: "Chihuahua",
    state: "Chihuahua",
    blurb: "Sierra y cultura norteña",
    lat: 28.6353,
    lon: -106.0889,
    iata: "CUU",
    groundOnly: false,
    region: "ciudades",
    scenery: "desierto",
    avgTempC: 24,
    highlights: ["Quinta Gameros", "Tren Chepe", "Barrancas del Cobre"],
  },
  {
    id: "tijuana",
    city: "Tijuana",
    state: "Baja California",
    blurb: "Gastronomía y frontera",
    lat: 32.5149,
    lon: -117.0382,
    iata: "TIJ",
    groundOnly: false,
    region: "ciudades",
    scenery: "metropoli",
    avgTempC: 21,
    highlights: ["CECUT", "Valle de Guadalupe", "Playas de Tijuana"],
  },
  {
    id: "aguascalientes",
    city: "Aguascalientes",
    state: "Aguascalientes",
    blurb: "Centro y aguas termales",
    lat: 21.8853,
    lon: -102.2916,
    iata: "AGU",
    groundOnly: false,
    region: "cultura",
    scenery: "colonial",
    avgTempC: 24,
    highlights: ["Jardín de San Marcos", "Museo Posada", "Calvillo"],
  },
  {
    id: "san-luis-potosi",
    city: "San Luis Potosí",
    state: "San Luis Potosí",
    blurb: "Centro y Huasteca",
    lat: 22.1565,
    lon: -100.9855,
    iata: "SLP",
    groundOnly: false,
    region: "cultura",
    scenery: "selva",
    avgTempC: 24,
    highlights: ["Plaza de Aranzazú", "Real de Catorce", "Huasteca Potosina"],
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
    region: "ciudades",
    scenery: "colonial",
    avgTempC: 26,
    highlights: ["Hospicio Cabañas", "Tlaquepaque", "Ruta del Tequila"],
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
    region: "ciudades",
    scenery: "metropoli",
    avgTempC: 27,
    highlights: ["Parque Fundidora", "Paseo Santa Lucía", "Chipinque"],
  },
  {
    id: "cdmx",
    city: "Ciudad de México",
    state: "CDMX",
    blurb: "Capital cultural y museos",
    lat: 19.4326,
    lon: -99.1332,
    iata: "MEX",
    groundOnly: false,
    region: "ciudades",
    scenery: "metropoli",
    avgTempC: 22,
    highlights: ["Chapultepec", "Coyoacán", "Centro Histórico"],
  },
];

/** Mexican airport codes used to validate matches from the public airport catalog. */
export const MEXICO_AIRPORT_CODES = new Set([
  "ACA",
  "AGU",
  "BJX",
  "CEN",
  "CJS",
  "CLQ",
  "CPE",
  "CUL",
  "CUN",
  "CUU",
  "CZM",
  "GDL",
  "HMO",
  "HUX",
  "LAP",
  "LMM",
  "MAM",
  "MEX",
  "MID",
  "MTY",
  "MXL",
  "MZT",
  "NLD",
  "NLU",
  "OAX",
  "PBC",
  "PDS",
  "PVR",
  "PXM",
  "QRO",
  "REX",
  "SJD",
  "SLP",
  "TAM",
  "TAP",
  "TGZ",
  "TIJ",
  "TLC",
  "TQO",
  "TRC",
  "UPN",
  "VER",
  "VSA",
  "ZCL",
  "ZIH",
  "ZLO",
]);

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

export const MEXICAN_AIRLINES = [
  { label: "Viva Aerobus oficial", code: "VB" },
  { label: "Volaris oficial", code: "Y4" },
  { label: "Aeroméxico oficial", code: "AM" },
] as const;
