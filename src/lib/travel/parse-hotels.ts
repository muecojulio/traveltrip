export type ParsedHotel = {
  name: string;
  perNight: number;
  stayTotal: number;
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
    .replace(/<[^>]+>/g, "")
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
  }
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0 || value > 500_000) return null;
  return value;
}

function moneyKind(token: string): "USD" | "MXN" {
  return /MX/i.test(token) ? "MXN" : "USD";
}

export function parseGoogleHotels(html: string): ParsedHotel[] {
  const text = html.replace(/&nbsp;|&#160;/g, " ");
  const chunks = text.split(/<h2\b/i).slice(1);
  const hotels: ParsedHotel[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    const nameMatch = chunk.match(/>([^<]{3,90})<\/h2>/i);
    if (!nameMatch) continue;
    const name = decode(nameMatch[1] ?? "");
    if (name.length < 3 || seen.has(name.toLowerCase())) continue;
    if (/filtro|mapa|ordenar|resultados/i.test(name)) continue;

    const night = chunk.match(
      /([\d][\d.,\s]*)\s*(US\$|MX\$|MXN)\s*por noche/i,
    );
    const total = chunk.match(
      /([\d][\d.,\s]*)\s*(US\$|MX\$|MXN)\s*en total/i,
    );
    if (!night && !total) continue;

    const nightAmount = night ? parseAmount(night[1] ?? "") : null;
    const totalAmount = total ? parseAmount(total[1] ?? "") : null;
    const currency = moneyKind((total?.[2] ?? night?.[2] ?? "US$"));
    const perNight = nightAmount ?? totalAmount;
    const stayTotal = totalAmount ?? nightAmount;
    if (perNight == null || stayTotal == null) continue;

    const href = chunk.match(/href="(\/travel\/hotels\/entity\/[^"]+)"/i);
    const ratingMatch = [...chunk.matchAll(/([\d]+(?:[.,]\d+)?)\s*de\s*5/g)].at(-1);
    const reviewsMatch = [...chunk.matchAll(/de\s*([\d][\d.,]*)\s*reseñas/gi)].at(-1);

    seen.add(name.toLowerCase());
    hotels.push({
      name,
      perNight,
      stayTotal,
      currency,
      rating: ratingMatch ? parseAmount(ratingMatch[1] ?? "") : null,
      reviews: reviewsMatch
        ? Math.round(parseAmount(reviewsMatch[1] ?? "") ?? 0) || null
        : null,
      googlePath: href?.[1] ? decode(href[1]) : null,
    });
    if (hotels.length >= 12) break;
  }

  return hotels;
}
