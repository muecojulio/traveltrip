type ParsedHotel = {
  name: string;
  perNight: number;
  stayTotal: number;
  hasStayTotal: boolean;
  currency: "USD" | "MXN";
  rating: number | null;
  reviews: number | null;
  googlePath: string | null;
};

function decode(value: string): string {
  const amp = "&" + "amp;";
  const quot = "&" + "quot;";
  const apos = "&" + "apos;";
  const nbsp = "&" + "nbsp;";
  const numNbsp = "&" + "#160;";
  const numApos = "&" + "#39;";
  return value
    .replaceAll(amp, "&")
    .replaceAll(quot, '"')
    .replaceAll(apos, "'")
    .replaceAll(numApos, "'")
    .replaceAll(nbsp, " ")
    .replaceAll(numNbsp, " ")
    .replace(/<[^>]*>?/g, " ")
    .replace(/[\p{Cc}<>]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, "").replace(/[^\d.,]/g, "");
  if (!cleaned) return null;
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized = cleaned;
  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = cleaned.split(",");
    const tail = parts[parts.length - 1] ?? "";
    normalized = tail.length === 3 ? cleaned.replace(/,/g, "") : cleaned.replace(",", ".");
  } else if (hasDot) {
    const parts = cleaned.split(".");
    const tail = parts[parts.length - 1] ?? "";
    if (parts.length > 2 || tail.length === 3) normalized = cleaned.replace(/\./g, "");
  }
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0 || value > 500_000) return null;
  return value;
}

function parseCount(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,]/g, "");
  if (!cleaned) return null;
  const digits = cleaned.replace(/[.,]/g, "");
  const value = Number(digits);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function priceBeforeKeyword(
  text: string,
  keyword: "por noche" | "en total",
): { amount: number; currency: "USD" | "MXN" } | null {
  const index = text.toLowerCase().indexOf(keyword);
  if (index < 0) return null;
  const before = text.slice(Math.max(0, index - 100), index);
  const matches = [
    ...before.matchAll(
      /(?:US\s?\$|USD|MX\s?\$|MXN|\$)\s*[\d][\d.,\s]{0,24}|[\d][\d.,\s]{0,24}\s*(?:US\s?\$|USD|MX\s?\$|MXN|\$)/gi,
    ),
  ];
  const token = matches.at(-1)?.[0];
  if (!token) return null;
  const amount = parseAmount(token.replace(/US\s?\$|USD|MX\s?\$|MXN|\$/gi, ""));
  if (amount == null) return null;
  const currency = /US\s?\$|USD/i.test(token) ? "USD" : "MXN";
  return { amount, currency };
}

function parseRating(raw: string): number | null {
  const normalized = raw.replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 && value <= 5 ? value : null;
}

function sanitizeGoogleEntityPath(rawPath: string | undefined): string | null {
  if (!rawPath) return null;
  const decoded = decode(rawPath);
  if (!decoded.startsWith("/travel/hotels/entity/")) return null;
  if (decoded.includes("..") || /[\s"'<>\\]/.test(decoded)) return null;
  return decoded.slice(0, 200);
}

/**
 * Read Google Hotels' publicly rendered price cards. This is intentionally a
 * tolerant HTML parser, not an official Google/Booking/Despegar API.
 */
export function parseGoogleHotels(html: string, nights = 1): ParsedHotel[] {
  const safeNights = Number.isFinite(nights) && nights > 0 ? Math.floor(nights) : 1;
  const chunks = html.split(/<h2\b/i).slice(1);
  const hotels: ParsedHotel[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    const nameMatch = chunk.match(/>([^<]{3,90})<\/h2>/i);
    if (!nameMatch) continue;
    const name = decode(nameMatch[1] ?? "");
    if (name.length < 3 || seen.has(name.toLowerCase())) continue;
    if (/filtro|mapa|ordenar|resultados/i.test(name)) continue;

    const text = decode(chunk);
    const night = priceBeforeKeyword(text, "por noche");
    const total = priceBeforeKeyword(text, "en total");
    if (!night && !total) continue;

    const currency = total?.currency ?? night?.currency ?? "MXN";
    const perNight = night?.amount ?? (total ? total.amount / safeNights : null);
    const stayTotal = total?.amount ?? (night ? night.amount * safeNights : null);
    if (perNight == null || stayTotal == null) continue;

    const href = chunk.match(/href="(\/travel\/hotels\/entity\/[^"]+)"/i);
    const ratingMatch = [...text.matchAll(/([\d]+(?:[.,]\d+)?)\s*de\s*5/gi)].at(-1);
    const reviewsMatch = [...text.matchAll(/de\s*([\d][\d.,]*)\s*reseñas/gi)].at(-1);

    seen.add(name.toLowerCase());
    hotels.push({
      name,
      perNight,
      stayTotal,
      hasStayTotal: total != null,
      currency,
      rating: ratingMatch ? parseRating(ratingMatch[1] ?? "") : null,
      reviews: reviewsMatch ? parseCount(reviewsMatch[1] ?? "") : null,
      googlePath: sanitizeGoogleEntityPath(href?.[1]),
    });
    if (hotels.length >= 12) break;
  }

  return hotels;
}
