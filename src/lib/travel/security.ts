import type { Quote } from "./types.ts";

/**
 * Error class whose `.message` is explicitly safe to show to end users.
 * Unexpected internal or database errors are masked behind a generic Spanish message.
 */
export class PublicSearchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicSearchError";
  }
}

export const ALLOWED_FETCH_HOSTS = new Set([
  "www.google.com",
  "mcp.octotrip.app",
  "latest.currency-api.pages.dev",
  "api.open-meteo.com",
  "nominatim.openstreetmap.org",
]);

/**
 * Validate that a URL is strictly HTTPS, has no embedded credentials or custom ports,
 * and belongs to the allowed host set.
 */
export function validateAllowedUrl(
  rawUrl: string,
  allowedHosts: ReadonlySet<string> = ALLOWED_FETCH_HOSTS,
): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new PublicSearchError("URL de fuente externa inválida.");
  }
  if (parsed.protocol !== "https:") {
    throw new PublicSearchError("Solo se permiten conexiones seguras HTTPS.");
  }
  if (parsed.username || parsed.password) {
    throw new PublicSearchError("No se permiten credenciales en la URL.");
  }
  if (parsed.port && parsed.port !== "443") {
    throw new PublicSearchError("Puerto no permitido en la fuente externa.");
  }
  if (!allowedHosts.has(parsed.hostname)) {
    throw new PublicSearchError("Fuente externa fuera de la lista permitida.");
  }
  return parsed;
}

/**
 * Read a fetch Response body stream with a hard byte ceiling.
 * Aborts immediately as soon as cumulative bytes exceed `maxBytes` so an upstream
 * server cannot exhaust memory by omitting Content-Length.
 */
export async function readResponseBytesWithLimit(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array> {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new PublicSearchError("La respuesta externa superó el límite de tamaño seguro.");
  }
  if (!response.body) {
    return new Uint8Array(0);
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel("Respuesta demasiado grande").catch(() => undefined);
          throw new PublicSearchError("La respuesta externa superó el límite de tamaño seguro.");
        }
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

/**
 * Sanitize and validate a custom Mexican city name entered by the user.
 * Strips control characters, rejects path traversal (`..`), HTML tags, or non-name symbols.
 */
export function sanitizeCityName(raw: string): string {
  const cleaned = raw
    .replace(/[\p{Cc}<>`\\]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  if (!cleaned) return "";
  if (cleaned.includes("..") || cleaned.includes("/")) {
    throw new PublicSearchError("Nombre de ciudad no válido.");
  }
  if (!/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s.,'-]+$/.test(cleaned)) {
    throw new PublicSearchError("Usa solo letras y espacios para el nombre de la ciudad.");
  }
  return cleaned;
}

/**
 * Strip control chars and angle brackets from untrusted external text (hotel/airline names, etc.).
 */
export function sanitizePlainText(raw: string, maxLength = 140): string {
  return raw
    .replace(/[\p{Cc}<>]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/**
 * Validate an external or internal link before rendering in `<a href>`.
 * Blocks `javascript:`, `data:`, `vbscript:`, `http:`, and malformed URLs.
 */
export function safeExternalHref(href: string | undefined | null): string | null {
  if (!href || typeof href !== "string") return null;
  const trimmed = href.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Sliding-window rate limiter to protect server search endpoints from automated flood/DoS.
 */
type RateBucket = { timestamps: number[] };
const rateBuckets = new Map<string, RateBucket>();

export function checkSearchRateLimit(
  key = "global-search",
  options: { windowMs?: number; maxRequests?: number; now?: number } = {},
): { allowed: boolean; retryAfterSeconds: number } {
  const windowMs = options.windowMs ?? 60_000;
  const maxRequests = options.maxRequests ?? 25;
  const now = options.now ?? Date.now();
  const cutoff = now - windowMs;

  const bucket = rateBuckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= maxRequests) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    rateBuckets.set(key, bucket);
    return { allowed: false, retryAfterSeconds };
  }

  bucket.timestamps.push(now);
  rateBuckets.set(key, bucket);

  // Prevent unbounded bucket map growth
  if (rateBuckets.size > 200) {
    for (const [k, v] of rateBuckets) {
      if (v.timestamps.every((t) => t <= cutoff)) rateBuckets.delete(k);
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Safely validate and sanitize saved trips read from browser `localStorage`
 * so tampered or corrupted JSON can never crash the UI or inject unsafe URLs.
 */
export function sanitizeSavedTrips<
  T extends { id: string; quote: Quote; selectedHotelName?: string },
>(raw: unknown): T[] {
  if (!Array.isArray(raw)) return [];
  const valid: T[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.id !== "string" || !candidate.id.trim()) continue;
    const quote = candidate.quote as Record<string, unknown> | undefined;
    if (!quote || typeof quote !== "object") continue;
    if (
      typeof quote.place !== "string" ||
      typeof quote.checkIn !== "string" ||
      typeof quote.checkOut !== "string" ||
      typeof quote.nights !== "number" ||
      typeof quote.adults !== "number" ||
      !Array.isArray(quote.hotels) ||
      !Array.isArray(quote.flights)
    ) {
      continue;
    }
    valid.push({
      id: sanitizePlainText(candidate.id, 120),
      selectedHotelName:
        typeof candidate.selectedHotelName === "string"
          ? sanitizePlainText(candidate.selectedHotelName, 120)
          : undefined,
      quote: quote as unknown as Quote,
    } as T);
    if (valid.length >= 8) break;
  }
  return valid;
}
