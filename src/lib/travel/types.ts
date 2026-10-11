export type HotelOffer = {
  name: string;
  perNightMxn: number;
  stayTotalMxn: number;
  rating: number | null;
  reviews: number | null;
  source: string;
  links: { label: string; href: string }[];
};

export type FlightOffer = {
  id: string;
  airline: string;
  airlineCode: string;
  numbers: string[];
  priceMxn: number;
  cabinIncluded: boolean | null;
  baggage: string;
  arrivalTime: string;
  arrivalDate: string;
  departureTime: string;
  departureAirport: string;
  arrivalAirport: string;
  sameDay: boolean;
  arrivesBy14: boolean;
  direct: boolean;
  durationMinutes: number | null;
  gate: string;
  source: string;
  qualifies: boolean;
  rejectReason: string | null;
  links: { label: string; href: string }[];
};

export type Combo = {
  hotelName: string;
  hotelMxn: number;
  flightLabel: string | null;
  flightMxn: number;
  totalMxn: number;
  arrival: string | null;
  cabin: boolean | null;
  why: string;
};

export type WeatherDay = {
  date: string;
  label: string;
  max: number | null;
  min: number | null;
};

export type Quote = {
  place: string;
  state: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  originLabel: string | null;
  flightMode: boolean;
  hotels: HotelOffer[];
  flights: FlightOffer[];
  otherFlights: FlightOffer[];
  hiddenFlights: number;
  best: Combo | null;
  alternatives: Combo[];
  weather: WeatherDay[];
  usdMxn: number | null;
  notices: string[];
  fetchedAt: string;
  cached: boolean;
  cityLinks: { label: string; href: string }[];
};
