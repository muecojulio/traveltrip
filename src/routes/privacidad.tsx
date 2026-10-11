import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidad")({
  component: Privacy,
});

function Privacy() {
  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-8 text-ink">
      <Link to="/" className="text-sm text-lagoon">
        Volver
      </Link>
      <h1 className="mt-4 font-display text-4xl text-ink">Privacidad</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted">
        <p>
          TravelTrip no pide cuenta, no cobra dentro de la app y no guarda tu nombre, correo ni datos
          de pago. Los viajes guardados se quedan en el almacenamiento local de este navegador y se
          pueden quitar desde Guardados.
        </p>
        <p>
          Para una búsqueda, el servidor envía destino, fechas, aeropuerto y número de adultos a las
          fuentes externas necesarias para buscar tarifas. Las consultas públicas de clima, tipo de
          cambio y geocodificación no requieren API key ni inicio de sesión. No se envían datos de
          identidad.
        </p>
        <p>
          Los precios de hotel se leen de la página pública de Google Hotels. Booking.com y Despegar
          no exponen aquí una API pública estable sin registro; sus botones abren búsquedas con el
          destino y las fechas para revisar la disponibilidad y el precio final directamente. El
          enlace «Buscar sitio oficial» abre una búsqueda del hotel, no afirma ser una página oficial
          verificada.
        </p>
        <p>
          Los vuelos se consultan en fuentes públicas de comparación (OctoTrip MCP y Google Flights,
          mediante el paquete abierto google-flights-ts) sin llave ni cuenta. Google Flights es una
          integración no oficial y puede limitarla o cambiarla. Solo contamos una maleta de mano como
          incluida cuando la fuente lo indica; revisa la tarifa final y el equipaje en la aerolínea o
          Despegar antes de pagar.
        </p>
        <p>
          Para acelerar consultas repetidas, el servidor puede guardar una copia temporal de la
          búsqueda —ciudad, fechas y precios, sin identidad— durante hasta cinco minutos. La hora de
          consulta y si se usó esa copia se muestran en el resultado. Las tarifas pueden variar por
          disponibilidad, impuestos y reglas del proveedor.
        </p>
        <p>
          Los enlaces externos pueden aplicar sus propias cookies, atribución o políticas de
          privacidad. TravelTrip no recibe tus datos de pago ni confirma una reserva.
        </p>
      </div>
    </main>
  );
}
