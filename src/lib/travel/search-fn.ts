import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Quote } from "./types";

const schema = z.object({
  destinationId: z.string().min(1).max(40),
  customCity: z.string().max(60).default(""),
  originIata: z.string().regex(/^[A-Z]{3}$/),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(6),
  cabinOnly: z.boolean(),
  arriveBy14: z.boolean(),
});

export type SearchResult =
  | { ok: true; quote: Quote }
  | { ok: false; message: string };

export const searchTrip = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      throw new Error("Revisa destino, fechas y viajeros.");
    }
    return parsed.data;
  })
  .handler(async ({ data }): Promise<SearchResult> => {
    try {
      const { runSearch } = await import("./run-search");
      const quote = await runSearch(data);
      return { ok: true, quote };
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo completar la búsqueda.";
      return { ok: false, message };
    }
  });
