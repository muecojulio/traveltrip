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
          TravelTrip no pide cuenta, no cobra dentro de la app y no guarda tu nombre, correo ni datos de pago.
        </p>
        <p>
          La búsqueda corre en el servidor. Consulta páginas y APIs públicas (Google Hotels, tarifas de vuelo sin llave, clima y tipo de cambio) y puede guardar una copia anónima del resultado —ciudad, fechas y precios— durante unos minutos para no repetir la misma consulta. Esa copia no está ligada a una persona.
        </p>
        <p>
          Lo que marques como guardado se queda solo en este teléfono, en el almacenamiento del navegador. Bórralo desde Guardados.
        </p>
        <p>
          Los botones de Booking, Despegar, aerolínea y tarifa abren sitios de terceros. El enlace de tarifa de vuelo puede incluir atribución de afiliado, sin costo extra para ti. Esos sitios tienen su propia política.
        </p>
        <p>
          No vendemos información. No hay seguimiento publicitario propio. Si publicas la app, el navegador puede pedir permiso para instalarla en la pantalla de inicio; eso no comparte tu agenda ni tus contactos.
        </p>
      </div>
    </main>
  );
}
