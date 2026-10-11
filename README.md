# TravelTrip

Cotizador de vacaciones en México: eliges destino, fechas, adultos y hotel; compara el alojamiento con un vuelo redondo cuando corresponde y calcula la combinación más barata disponible.

## Qué hace

- Busca tarifas de hotel al momento de la consulta y permite elegir un hotel para recalcular el total.
- Incluye fechas de entrada y salida, número de adultos, precio por noche y total estimado de estancia.
- Para destinos distintos de Cuernavaca, Veracruz y Acapulco, busca vuelos redondos desde un aeropuerto mexicano seleccionado.
- Por defecto filtra llegadas el mismo día antes o a las 14:00 y tarifas donde la fuente confirma maleta de mano. La fuente debe confirmar el equipaje; un artículo personal no cuenta como maleta de mano.
- Suma estancia y vuelo para mostrar la opción más barata y sus componentes. El precio consultado y su hora aparecen en el resultado; la caché anónima dura hasta cinco minutos.
- Abre Booking, Despegar, Google Flights, páginas oficiales de aerolíneas y búsqueda del sitio oficial del hotel con fechas y ocupación cuando el destino/fuente lo permite.
- Guarda viajes únicamente en el almacenamiento local del navegador; no pide cuenta ni datos de pago.

## Fuentes sin llave

- Google Hotels y Google Flights: lectura de páginas públicas para obtener precios al consultar. Booking y Despegar no ofrecen aquí un endpoint público estable sin registro; se abren como búsquedas de comparación con los datos elegidos.
- OctoTrip MCP público y Google Flights vía [`google-flights-ts`](https://github.com/wooldox/google-flights-ts): consultas de vuelos sin API key ni inicio de sesión. Google Flights es una integración no oficial y puede cambiar o limitar solicitudes. Cuando la tarifa no confirma equipaje, no se presenta como una combinación que incluya maleta.
- [Open-Meteo](https://open-meteo.com/): clima sin llave.
- [Nominatim / OpenStreetMap](https://nominatim.openstreetmap.org/): geocodificación de otra ciudad sin llave.
- [Currency API](https://github.com/fawazahmed0/currency-api): conversión pública USD/MXN sin llave.

Los precios de hoteles y vuelos cambian según disponibilidad, impuestos y tarifa final. TravelTrip los compara, pero la reserva y confirmación se hacen directamente con el proveedor. Si no hay un aeropuerto identificable o una maleta confirmada, la app evita inventar un precio total.

## Atribución

La búsqueda de vuelos y el catálogo de aeropuertos usan el paquete MIT [`google-flights-ts`](https://github.com/wooldox/google-flights-ts). Consulta `THIRD_PARTY_NOTICES.md` para su atribución y licencia.
