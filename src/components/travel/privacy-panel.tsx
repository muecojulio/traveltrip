import {
  Check,
  Database,
  ExternalLink,
  Globe,
  HardDrive,
  Lock,
  Scale,
  ShieldCheck,
  Trash2,
  UserX,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ActionButton } from "@/components/interactions/action-button";
import { Disclosure } from "@/components/interactions/disclosure";

const EXTERNAL_SOURCES = [
  {
    name: "Google Hotels (página pública)",
    dataSent: "Ciudad de destino, fecha de entrada/salida y número de adultos.",
    purpose: "Lectura de tarifas públicas por noche y total estimado de estancia en MXN/USD.",
    retention: "Hasta 5 minutos en caché anónima.",
  },
  {
    name: "OctoTrip MCP Público",
    dataSent: "Código IATA de origen y destino, fechas de viaje y número de adultos.",
    purpose:
      "Consulta de vuelos redondos en vivo, horarios de llegada y confirmación de maleta de mano.",
    retention: "Hasta 5 minutos en caché anónima.",
  },
  {
    name: "Google Flights (vía google-flights-ts)",
    dataSent: "Ruta IATA redonda, fechas y número de pasajeros adultos en clase económica.",
    purpose: "Comparación de tarifas aéreas públicas cuando están disponibles.",
    retention: "Hasta 5 minutos en caché anónima.",
  },
  {
    name: "Open-Meteo API",
    dataSent: "Latitud, longitud y rango de fechas del viaje.",
    purpose: "Pronóstico meteorológico diario (temperatura máxima/mínima y condición del cielo).",
    retention: "Hasta 30 minutos en caché de servicios.",
  },
  {
    name: "Nominatim / OpenStreetMap",
    dataSent: "Nombre de la ciudad mexicana escrita en «Otra ciudad».",
    purpose: "Geocodificación pública para obtener coordenadas dentro de México.",
    retention: "Hasta 7 días en caché de coordenadas.",
  },
  {
    name: "Currency API (fawazahmed0)",
    dataSent: "Ningún dato del viaje (consulta general del par USD/MXN).",
    purpose:
      "Conversión transparente de tarifas publicadas en dólares estadounidenses a pesos mexicanos.",
    retention: "Hasta 30 minutos en caché de servicios.",
  },
];

type PrivacyPanelProps = {
  savedCount: number;
  onClearSaved: () => void;
};

export function PrivacyPanel({ savedCount, onClearSaved }: PrivacyPanelProps) {
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    if (savedCount > 0) {
      setCleared(false);
    }
  }, [savedCount]);

  function handleClear() {
    onClearSaved();
    setCleared(true);
  }

  return (
    <section className="space-y-5">
      <div className="rounded-card border border-line bg-elev p-5 card-shadow">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold tracking-wider text-clay uppercase">
            Aviso y Política Integral de Privacidad
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-lagoon-soft px-3 py-1 text-xs font-semibold text-lagoon">
            <ShieldCheck aria-hidden="true" className="size-3.5" />
            Privacidad por diseño · Vigencia: Octubre 2026
          </span>
        </div>

        <h2 className="mt-2 font-display text-2xl text-ink sm:text-3xl">
          Política de Privacidad y Protección de Datos
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-muted">
          <strong>TravelTrip</strong> está diseñado bajo el principio de{" "}
          <strong>minimización absoluta de datos</strong>. No pedimos cuenta, no cobramos dentro de
          la aplicación y no recopilamos ni almacenamos tu nombre, correo electrónico, teléfono,
          dirección IP ni datos de pago.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-bg/60 p-3.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <UserX aria-hidden="true" className="size-4 text-clay" />
              Cero cuentas e identidad
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              No existe registro de usuarios, inicio de sesión obligatorio ni perfiles personales en
              nuestros servidores.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-bg/60 p-3.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Lock aria-hidden="true" className="size-4 text-lagoon" />
              Cero datos bancarios
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              TravelTrip es un comparador informativo; jamás solicita tarjetas de crédito, débito ni
              procesa cargos.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-bg/60 p-3.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Database aria-hidden="true" className="size-4 text-marigold" />
              Caché anónima temporal (5 min)
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Las cotizaciones se guardan temporalmente sin identificadores personales para acelerar
              consultas repetidas y se purgan automáticamente.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-bg/60 p-3.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <HardDrive aria-hidden="true" className="size-4 text-jade" />
              Tus guardados quedan en tu equipo
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Los viajes marcados se guardan únicamente en el almacenamiento local de tu navegador (
              <code>localStorage</code>).
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Local Data Control Panel */}
      <div
        aria-labelledby="control-local-heading"
        className="rounded-card border border-lagoon/50 bg-elev p-4 card-shadow"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 id="control-local-heading" className="font-display text-xl text-ink">
              Panel de Control de tus Datos Locales
            </h3>
            <p className="mt-1 text-xs text-muted">
              Revisa y elimina en cualquier momento la información guardada en este navegador:{" "}
              <strong>
                {savedCount} {savedCount === 1 ? "viaje guardado" : "viajes guardados"}
              </strong>
              .
            </p>
          </div>
          <ActionButton
            variant={savedCount > 0 ? "danger" : "secondary"}
            size="md"
            disabled={savedCount === 0}
            onClick={handleClear}
            icon={
              cleared ? (
                <Check aria-hidden="true" className="size-4" />
              ) : (
                <Trash2 aria-hidden="true" className="size-4" />
              )
            }
          >
            {cleared ? "Datos locales eliminados" : "Borrar mis viajes guardados ahora"}
          </ActionButton>
        </div>
      </div>

      {/* Detailed Legal Sections */}
      <div className="space-y-3">
        <Disclosure
          defaultOpen
          summary="1. Marco Normativo y Naturaleza del Servicio (LFPDPPP)"
          description="Cumplimiento con los principios de protección de datos en México."
        >
          <div className="space-y-2.5 text-sm leading-relaxed text-muted">
            <p>
              En apego a los principios de licitud, información, transparencia y minimización
              previstos en la{" "}
              <strong>
                Ley Federal de Protección de Datos Personales en Posesión de los Particulares
                (LFPDPPP)
              </strong>{" "}
              en México, informamos que <strong>TravelTrip no recaba datos personales</strong> ni
              datos personales sensibles de sus visitantes.
            </p>
            <p>
              La aplicación funciona exclusivamente como una herramienta de cálculo y comparación en
              tiempo real de tarifas públicas de hospedaje y transporte aéreo hacia destinos en
              México.
            </p>
          </div>
        </Disclosure>

        <Disclosure
          defaultOpen
          count={EXTERNAL_SOURCES.length}
          summary="2. Fuentes Externas Consultadas y Datos Técnicos Enviados"
          description="Detalle de qué parámetros de viaje se transmiten al cotizar un destino."
        >
          <div className="space-y-3 text-xs leading-relaxed text-muted">
            <p>
              Cuando presionas <strong>Cotizar en vivo</strong>, el servidor de TravelTrip realiza
              peticiones HTTPS salientes únicamente a dominios autorizados en nuestra lista blanca
              de seguridad, enviando solo los parámetros de búsqueda (destino, fechas y número de
              adultos), sin adjuntar cookies ni identidad del usuario:
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {EXTERNAL_SOURCES.map((source) => (
                <div
                  key={source.name}
                  className="rounded-xl border border-line bg-bg/60 p-3 text-xs"
                >
                  <p className="font-semibold text-ink">{source.name}</p>
                  <p className="mt-1">
                    <strong className="text-ink">Parámetros:</strong> {source.dataSent}
                  </p>
                  <p className="mt-1">
                    <strong className="text-ink">Finalidad:</strong> {source.purpose}
                  </p>
                  <p className="mt-1 text-lagoon">
                    <strong>Retención:</strong> {source.retention}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Disclosure>

        <Disclosure
          defaultOpen
          summary="3. Política de Caché Anónima e Indexación en Base de Datos"
          description="Cómo funcionan las tablas quote_cache y service_cache y cuándo se purgan."
        >
          <div className="space-y-2.5 text-sm leading-relaxed text-muted">
            <p>
              Para ofrecer respuestas rápidas y evitar saturar las fuentes públicas, TravelTrip
              utiliza una arquitectura de caché anónima en dos niveles:
            </p>
            <ul className="list-disc space-y-1.5 pl-5 text-xs">
              <li>
                <strong>Caché L1 en memoria (LRU):</strong> Conserva temporalmente las cotizaciones
                más recientes en la memoria del proceso con expiración estricta de 5 minutos.
              </li>
              <li>
                <strong>
                  Caché L2 en base de datos (<code>quote_cache</code> y <code>service_cache</code>):
                </strong>{" "}
                Guarda únicamente la clave técnica de consulta (ciudad, aeropuerto IATA, fechas,
                número de adultos y filtros), el resultado público de precios y la marca de tiempo.
                Cuenta con índices sobre <code>expires_at</code>,{" "}
                <code>(destination_id, origin_iata, fetched_at)</code> y mejor tarifa para acelerar
                la consulta y la depuración automática de registros vencidos.
              </li>
              <li>
                <strong>Transparencia en pantalla:</strong> Cada resultado indica la hora exacta de
                consulta (huso horario de la Ciudad de México) y si provino de caché o de una
                lectura en vivo. Puedes forzar una consulta fresca en cualquier momento con el botón{" "}
                <strong>Actualizar precios</strong>.
              </li>
            </ul>
          </div>
        </Disclosure>

        <Disclosure
          summary="4. Almacenamiento Local (localStorage), Código QR Local y Cookies"
          description="Qué se guarda en tu navegador y cómo funciona la instalación sin rastreadores."
        >
          <div className="space-y-2.5 text-sm leading-relaxed text-muted">
            <p>
              TravelTrip no utiliza cookies publicitarias, píxeles de seguimiento ni analítica
              invasiva de terceros. Únicamente emplea dos llaves en el almacenamiento local de tu
              navegador (<code>window.localStorage</code>):
            </p>
            <ul className="list-disc space-y-1.5 pl-5 text-xs">
              <li>
                <code>traveltrip-saved</code>: Guarda hasta 8 cotizaciones que tú decidas marcar
                manualmente. Esta información nunca se transmite al servidor y se valida contra
                esquemas seguros al cargarse.
              </li>
              <li>
                <code>traveltrip-theme</code>: Recuerda tu preferencia visual entre tema claro y
                tema oscuro.
              </li>
              <li>
                <strong>Código QR generado localmente:</strong> El código QR de la pestaña{" "}
                <strong>Instalar</strong> se calcula en tu propio dispositivo mediante vectores SVG
                (ISO/IEC 18004) sin enviar la dirección a generadores externos de terceros.
              </li>
            </ul>
          </div>
        </Disclosure>

        <Disclosure
          summary="5. Medidas de Seguridad Activas y Prevención de Vulnerabilidades"
          description="Controles técnicos aplicados para proteger tus consultas y la plataforma."
        >
          <div className="space-y-2.5 text-sm leading-relaxed text-muted">
            <ul className="list-disc space-y-1.5 pl-5 text-xs">
              <li>
                <strong>Lista blanca estricta anti-SSRF:</strong> El servidor valida que toda
                conexión externa use exclusivamente el protocolo <code>https:</code> hacia los
                dominios permitidos, bloqueando puertos no estándar, credenciales embebidas y
                redirecciones fuera de la lista autorizada.
              </li>
              <li>
                <strong>Lectura en streaming con límite de memoria:</strong> Las respuestas externas
                se leen por fragmentos con un tope estricto de bytes para impedir ataques de
                agotamiento de memoria (DoS).
              </li>
              <li>
                <strong>Validación y sanitización de entradas:</strong> Todos los parámetros pasan
                por validación de esquemas con <code>Zod</code> y limpieza de caracteres de control,
                etiquetas HTML y secuencias de recorrido de rutas (<code>..</code>).
              </li>
              <li>
                <strong>Limitación de tasa (Rate Limiting):</strong> Protección por ventana
                deslizante en el servidor para mitigar abuso automatizado.
              </li>
              <li>
                <strong>Cabeceras HTTP y enlaces seguros:</strong> Configuración de{" "}
                <code>X-Content-Type-Options: nosniff</code>,{" "}
                <code>Referrer-Policy: strict-origin-when-cross-origin</code>,{" "}
                <code>Permissions-Policy</code> restrictiva y atributos{" "}
                <code>rel=&quot;noopener noreferrer&quot;</code> en todos los enlaces de salida.
              </li>
            </ul>
          </div>
        </Disclosure>

        <Disclosure
          summary="6. Enlaces Externos, Reservas y Derechos ARCO"
          description="Condiciones al abrir Booking, Despegar, Google Flights o aerolíneas."
        >
          <div className="space-y-2.5 text-sm leading-relaxed text-muted">
            <p>
              Los botones de comparación hacia <strong>Booking.com</strong>,{" "}
              <strong>Despegar</strong>, <strong>Google Flights</strong>,{" "}
              <strong>Google Hotels</strong> y sitios oficiales de aerolíneas (Aeroméxico, Volaris,
              Viva Aerobus, etc.) abren páginas externas en una nueva pestaña. Al salir de
              TravelTrip, cada proveedor aplica sus propios términos, cookies y avisos de
              privacidad.
            </p>
            <p>
              El enlace <strong>«Buscar sitio oficial»</strong> ejecuta una búsqueda pública para
              ayudarte a localizar el portal directo del hotel; verifica siempre el dominio, los
              impuestos aplicables (IVA e ISH), el equipaje incluido y las políticas de cancelación
              antes de realizar cualquier pago.
            </p>
            <p>
              <strong>Derechos ARCO (Acceso, Rectificación, Cancelación y Oposición):</strong> Dado
              que TravelTrip no almacena datos personales identificables en sus servidores,
              cualquier dato guardado reside únicamente en tu propio navegador y puedes consultarlo
              o cancelarlo de inmediato desde la pestaña <strong>Guardados</strong> o mediante el
              botón de borrado incluido arriba en esta pestaña.
            </p>
          </div>
        </Disclosure>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-elev px-4 py-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Scale aria-hidden="true" className="size-3.5 text-lagoon" />
          TravelTrip · Comparador transparente de vacaciones en México
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Globe aria-hidden="true" className="size-3.5 text-clay" />
          Fuentes públicas sin llave · Sin rastreadores
          <ExternalLink aria-hidden="true" className="size-3 opacity-60" />
        </span>
      </footer>
    </section>
  );
}
