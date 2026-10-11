const mxnFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

/** Format a number as integer Mexican Pesos (e.g., "$4,250"). */
export function money(value: number): string {
  return mxnFormatter.format(Math.round(value));
}

/** Current calendar date in Mexico City timezone as YYYY-MM-DD, plus optional day offset. */
export function mexicoDate(offsetDays = 0): string {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 2026, (month ?? 1) - 1, (day ?? 1) + offsetDays));
  return date.toISOString().slice(0, 10);
}

/** Add integer calendar days to an ISO YYYY-MM-DD string in UTC. */
export function addIsoDays(isoDate: string, offset: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 2000, (month ?? 1) - 1, (day ?? 1) + offset));
  return date.toISOString().slice(0, 10);
}

/** Validate that a string is a real calendar date in YYYY-MM-DD format. */
export function isIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

/** Number of nights between two ISO YYYY-MM-DD dates. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = Date.parse(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}
