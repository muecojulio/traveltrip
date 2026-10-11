import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkSearchRateLimit, PublicSearchError } from "./security";
import type { Quote } from "./types";

const schema = z.object({
  destinationId: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9-]+$/),
  customCity: z.string().max(60).default(""),
  originIata: z.string().regex(/^[A-Z]{3}$/),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(6),
  cabinOnly: z.boolean(),
  arriveBy14: z.boolean(),
  forceRefresh: z.boolean().optional().default(false),
});

type SearchResult = { ok: true; quote: Quote } | { ok: false; message: string };

export const searchTrip = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      throw new PublicSearchError("Revisa destino, fechas y número de viajeros.");
    }
    return parsed.data;
  })
  .handler(async ({ data }): Promise<SearchResult> => {
    const rateCheck = checkSearchRateLimit("search-trip");
    if (!rateCheck.allowed) {
      return {
        ok: false,
        message: `Demasiadas consultas seguidas. Espera ${rateCheck.retryAfterSeconds} s e inténtalo de nuevo.`,
      };
    }

    try {
      const { runSearch } = await import("./run-search");
      const quote = await runSearch(data);
      return { ok: true, quote };
    } catch (error) {
      const message =
        error instanceof PublicSearchError
          ? error.message
          : "No se pudo completar la búsqueda en este momento. Intenta de nuevo.";
      return { ok: false, message };
    }
  });
