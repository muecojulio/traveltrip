# TravelTrip — México Vivo

Cotizador visual de vacaciones en México: eliges destino, fechas, adultos y hotel; compara el alojamiento con un vuelo redondo cuando corresponde y calcula la combinación más barata disponible en tiempo real.

## Qué hace

- **Explorador Visual de Destinos («México Vivo»):** 25+ destinos mexicanos ilustrados por paisaje (Caribe, Pacífico, Colonial, Selva, Desierto y Metrópoli), filtro por región, clima típico y escapadas rápidas sugeridas a un clic.
- **Comparación en Vivo:** Busca tarifas de hotel al momento de la consulta y permite alternar entre hoteles para recalcular el paquete total y el costo por persona al instante.
- **Vuelos con Reglas de Comodidad:** Para destinos con vuelo, consulta vuelos redondos desde 10 aeropuertos mexicanos filtrando por defecto llegadas el mismo día antes o a las 14:00 hrs y tarifas con maleta de mano confirmada.
- **Caché Multi-Nivel e Índices de Base de Datos:**
  - **L1 en memoria (LRU)** + deduplicación de consultas concurrentes (`inFlight`).
  - **L2 en base de datos (`quote_cache` y `service_cache`)** con índices compuestos sobre `(destination_id, origin_iata, fetched_at desc)`, expiración (`expires_at`), mejor precio (`best_total_mxn`) y categoría de servicio (tipo de cambio USD/MXN, geocodificación y pronóstico del clima).
- **Seguridad Activa (Defensa en Profundidad):**
  - Validación de esquemas con `Zod` y sanitización contra inyección y recorrido de rutas (`..`).
  - Lista blanca estricta HTTPS anti-SSRF y lectura en streaming con tope de bytes (`readResponseBytesWithLimit`).
  - Limitación de tasa (`Rate Limiting`) por ventana deslizante.
  - Cabeceras HTTP de seguridad y sanitización de enlaces externos (`rel="noopener noreferrer"`).
- **Política de Privacidad Integral (`/privacidad`):** Alineada con la LFPDPPP en México; incluye auditoría en vivo y botón para borrar todos los datos guardados en `localStorage`.

## Fuentes sin llave

- **Google Hotels y Google Flights:** Lectura de páginas públicas para obtener precios al consultar. Booking y Despegar se abren como búsquedas directas con las fechas y ocupación elegidas.
- **OctoTrip MCP público y Google Flights vía [`google-flights-ts`](https://github.com/wooldox/google-flights-ts):** Consultas de vuelos sin API key ni cuenta.
- **[Open-Meteo](https://open-meteo.com/):** Pronóstico meteorológico diario sin llave.
- **[Nominatim / OpenStreetMap](https://nominatim.openstreetmap.org/):** Geocodificación de cualquier ciudad mexicana sin llave.
- **[Currency API](https://github.com/fawazahmed0/currency-api):** Conversión pública USD/MXN sin llave.

## Atribución

La búsqueda de vuelos y el catálogo de aeropuertos usan el paquete MIT [`google-flights-ts`](https://github.com/wooldox/google-flights-ts). Consulta `THIRD_PARTY_NOTICES.md` para su atribución y licencia.
