import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Laptop,
  MonitorSmartphone,
  QrCode,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tablet,
  Wifi,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ActionButton } from "@/components/interactions/action-button";
import { cx } from "@/lib/cx";
import {
  buildInstallQrUrl,
  detectDevicePlatform,
  generateQrMatrix,
  renderQrSvgString,
  type DevicePlatform,
} from "@/lib/travel/qr-code";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const QR_MODES: {
  id: DevicePlatform;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    id: "universal",
    label: "Universal · Cualquier dispositivo",
    shortLabel: "Universal",
    description:
      "Enlace directo universal compatible con Android, iPhone, iPad, Windows, Mac, Linux y tablets.",
  },
  {
    id: "ios",
    label: "iPhone y iPad (Asistente visual iOS)",
    shortLabel: "iPhone / iPad",
    description:
      "Abre el asistente visual paso a paso para agregar TravelTrip a la pantalla de inicio en Safari.",
  },
  {
    id: "android",
    label: "Android (Teléfonos y Tablets)",
    shortLabel: "Android",
    description:
      "Abre TravelTrip listo para instalar como aplicación web (PWA) en Chrome, Samsung Internet, Brave o Edge.",
  },
  {
    id: "desktop",
    label: "Computadora (Windows, macOS, Linux)",
    shortLabel: "PC / Mac",
    description:
      "Ideal para abrir o anclar TravelTrip como aplicación de escritorio en tu barra de tareas o Dock.",
  },
];

type DeviceGuide = {
  id: Exclude<DevicePlatform, "universal"> | "other";
  title: string;
  subtitle: string;
  browsers: string;
  steps: string[];
  tip: string;
};

const DEVICE_GUIDES: DeviceGuide[] = [
  {
    id: "android",
    title: "Android · Teléfonos y Tablets",
    subtitle: "Instalación directa como aplicación nativa (PWA)",
    browsers: "Chrome · Samsung Internet · Edge · Brave",
    steps: [
      "Apunta la cámara de tu Android al código QR de arriba y abre el enlace.",
      "Toca el aviso «Instalar TravelTrip» o abre el menú de tres puntos (⋮) en la esquina superior derecha.",
      "Selecciona «Instalar aplicación» o «Agregar a la pantalla principal».",
      "Confirma en «Instalar»: el icono de TravelTrip aparecerá junto a tus demás aplicaciones.",
    ],
    tip: "No ocupa espacio pesado ni requiere cuenta de Google Play.",
  },
  {
    id: "ios",
    title: "iPhone y iPad · iOS / iPadOS",
    subtitle: "Agregar a la pantalla de inicio desde Safari o Chrome",
    browsers: "Safari · Chrome para iOS",
    steps: [
      "Escanea el código QR con la cámara de tu iPhone o iPad y abre el enlace en Safari.",
      "Toca el botón Compartir (el cuadro con una flecha hacia arriba en la barra inferior o superior).",
      "Desliza el menú hacia abajo y toca «Agregar a la pantalla de inicio» (Add to Home Screen).",
      "Toca «Agregar» arriba a la derecha para tener TravelTrip a pantalla completa.",
    ],
    tip: "Si eliges el modo «iPhone / iPad» en el QR de arriba, al escanear verás una guía visual interactiva.",
  },
  {
    id: "desktop",
    title: "Windows y macOS · PC y Laptop",
    subtitle: "Ventana independiente en tu Barra de Tareas o Dock",
    browsers: "Chrome · Microsoft Edge · Safari (macOS Sonoma+)",
    steps: [
      "Abre TravelTrip en Chrome, Edge o Safari en tu computadora.",
      "En Chrome o Edge, haz clic en el icono de instalar (monitor con flecha) al lado derecho de la barra de direcciones.",
      "En Safari para Mac, abre el menú Archivo → «Agregar al Dock…».",
      "Confirma en «Instalar» para usar TravelTrip como aplicación de escritorio con inicio rápido.",
    ],
    tip: "También puedes pulsar el botón «Instalar en este dispositivo» aquí mismo si tu navegador lo soporta.",
  },
  {
    id: "other",
    title: "Linux, Chromebook y Otras Tablets",
    subtitle: "Acceso universal desde cualquier navegador moderno",
    browsers: "Chromium · Brave · Firefox · Vivaldi · Fire OS",
    steps: [
      "Escanea el código QR o copia el enlace universal en el navegador de tu dispositivo.",
      "En ChromeOS / Chromium / Brave, usa el menú (⋮) → «Guardar y compartir» → «Instalar página como app».",
      "En tablets Fire o navegadores móviles alternativos, elige «Añadir a pantalla de inicio».",
      "Abre TravelTrip desde tu lanzador de aplicaciones cuando quieras cotizar un viaje.",
    ],
    tip: "TravelTrip se adapta automáticamente a pantallas verticales, horizontales, táctiles y de escritorio.",
  },
];

export function InstallQrPanel() {
  const [baseOrigin, setBaseOrigin] = useState("https://traveltrip.app");
  const [qrMode, setQrMode] = useState<DevicePlatform>("universal");
  const [detectedPlatform, setDetectedPlatform] =
    useState<Exclude<DevicePlatform, "universal">>("desktop");
  const [activeGuide, setActiveGuide] = useState<DeviceGuide["id"]>("android");
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [copied, setCopied] = useState(false);
  const [installNotice, setInstallNotice] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBaseOrigin(window.location.origin);

    const detected = detectDevicePlatform(
      window.navigator.userAgent,
      window.navigator.maxTouchPoints ?? 0,
    );
    setDetectedPlatform(detected);
    setActiveGuide(detected);

    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      Boolean((window.navigator as { standalone?: boolean }).standalone);
    setIsStandalone(Boolean(standalone));

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setInstallNotice("¡TravelTrip quedó instalada en este dispositivo!");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const qrUrl = useMemo(() => buildInstallQrUrl(baseOrigin, qrMode), [baseOrigin, qrMode]);
  const qrMatrix = useMemo(() => generateQrMatrix(qrUrl, "M"), [qrUrl]);
  const activeModeInfo = QR_MODES.find((item) => item.id === qrMode) ?? QR_MODES[0];

  const quietZone = 4;
  const viewBoxSize = qrMatrix.size + quietZone * 2;
  const qrPathData = useMemo(() => {
    const segments: string[] = [];
    for (let r = 0; r < qrMatrix.size; r++) {
      for (let c = 0; c < qrMatrix.size; c++) {
        if (qrMatrix.modules[r][c]) {
          segments.push(`M${c + quietZone},${r + quietZone}h1v1h-1z`);
        }
      }
    }
    return segments.join("");
  }, [qrMatrix]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setInstallNotice(`Copia manualmente este enlace: ${qrUrl}`);
    }
  }

  async function shareLink() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "TravelTrip — México Vivo",
          text: "Instala TravelTrip en cualquier dispositivo para cotizar hotel + vuelo redondo en vivo:",
          url: qrUrl,
        });
        return;
      } catch {
        // User cancelled or share failed; fall back to copy
      }
    }
    await copyLink();
  }

  function downloadQrSvg() {
    const svgContent = renderQrSvgString(qrUrl);
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `traveltrip-qr-${qrMode}.svg`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function triggerInstallOnCurrentDevice() {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setInstallNotice("¡Instalación iniciada correctamente!");
          setDeferredPrompt(null);
        }
        return;
      } catch {
        // Fall through to guided instructions
      }
    }

    if (detectedPlatform === "ios") {
      setActiveGuide("ios");
      setInstallNotice(
        "En iPhone o iPad: toca el botón Compartir de Safari y selecciona «Agregar a la pantalla de inicio».",
      );
      return;
    }

    if (detectedPlatform === "android") {
      setActiveGuide("android");
      setInstallNotice(
        "En Android: abre el menú del navegador (⋮) y selecciona «Instalar aplicación» o «Agregar a la pantalla principal».",
      );
      return;
    }

    setActiveGuide("desktop");
    setInstallNotice(
      "En tu navegador: haz clic en el icono «Instalar TravelTrip» a la derecha de la barra de direcciones (o Archivo → Agregar al Dock en Safari).",
    );
  }

  const detectedLabel =
    detectedPlatform === "ios"
      ? "iPhone / iPad"
      : detectedPlatform === "android"
        ? "Android"
        : "Computadora / Escritorio";

  return (
    <section className="space-y-5">
      {/* Header & Device Status Banner */}
      <div className="rounded-card border border-line bg-elev p-5 card-shadow">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-clay/15 px-3 py-1 text-xs font-semibold text-clay">
            <QrCode aria-hidden="true" className="size-3.5" />
            Instalación multiplataforma por QR
          </span>
          <span
            className={cx(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
              isStandalone ? "bg-jade/20 text-good" : "bg-lagoon-soft text-lagoon",
            )}
          >
            <MonitorSmartphone aria-hidden="true" className="size-3.5" />
            {isStandalone
              ? "App instalada en este equipo"
              : `Tu dispositivo actual: ${detectedLabel}`}
          </span>
        </div>

        <h2 className="mt-2.5 font-display text-2xl text-ink sm:text-3xl">
          Instala TravelTrip en cualquier dispositivo
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Escanea el código QR con la cámara de tu teléfono o tablet, o instálala directamente en tu
          computadora. Funciona como aplicación nativa en{" "}
          <strong>Android, iPhone, iPad, Windows, macOS, Linux y Chromebook</strong> sin tiendas
          intermedias ni descargas pesadas.
        </p>
      </div>

      {/* Main QR Code & Target Selector Card */}
      <div className="rounded-card border border-line bg-elev p-5 card-shadow">
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-12">
          {/* Left column: High-contrast scannable QR card */}
          <div className="flex flex-col items-center md:col-span-5">
            <div className="relative rounded-2xl border-2 border-clay/60 bg-white p-4 shadow-md">
              <svg
                viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
                role="img"
                aria-label={`Código QR para instalar TravelTrip (${activeModeInfo.shortLabel})`}
                className="size-52 sm:size-56"
                shapeRendering="crispEdges"
              >
                <rect width={viewBoxSize} height={viewBoxSize} rx="2" fill="#ffffff" />
                <path d={qrPathData} fill="#132a28" />
              </svg>

              <div className="mt-2 flex items-center justify-between gap-2 border-t border-neutral-200 pt-2 text-[11px] font-semibold text-neutral-800">
                <span className="inline-flex items-center gap-1">
                  <span className="size-2 rounded-full bg-[#c84b31]" />
                  TravelTrip · México Vivo
                </span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-700">
                  {activeModeInfo.shortLabel}
                </span>
              </div>
            </div>

            <p className="mt-2.5 text-center text-xs text-muted">
              Apunta la cámara de cualquier celular o tablet al código QR
            </p>
          </div>

          {/* Right column: Mode selector, URL display, and instant actions */}
          <div className="space-y-4 md:col-span-7">
            <div>
              <p className="text-xs font-semibold tracking-wider text-lagoon uppercase">
                1. Elige el modo del código QR
              </p>
              <div
                role="group"
                aria-label="Modo de enlace del código QR"
                className="mt-2 grid grid-cols-2 gap-2"
              >
                {QR_MODES.map((mode) => {
                  const active = qrMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setQrMode(mode.id)}
                      className={cx(
                        "tap press rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors",
                        active
                          ? "border-clay bg-clay/12 text-ink ring-1 ring-clay"
                          : "border-line bg-bg/60 text-muted hover:border-lagoon/50 hover:text-ink",
                      )}
                    >
                      <span className="block font-semibold text-ink">{mode.shortLabel}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted">
                        {mode.id === "universal"
                          ? "Todo dispositivo"
                          : mode.id === "ios"
                            ? "Guía Safari iOS"
                            : mode.id === "android"
                              ? "App PWA directa"
                              : "Ventana de escritorio"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {activeModeInfo.description}
              </p>
            </div>

            {/* Encoded URL Box */}
            <div className="rounded-xl border border-line bg-bg/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">
                  Enlace codificado en el QR
                </span>
                <span className="text-[11px] text-lagoon">
                  QR v{qrMatrix.version} ({qrMatrix.size}×{qrMatrix.size})
                </span>
              </div>
              <p className="mt-1 break-all font-mono text-xs text-ink select-all">{qrUrl}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <ActionButton
                variant="primary"
                size="md"
                onClick={() => void triggerInstallOnCurrentDevice()}
                icon={<Sparkles aria-hidden="true" className="size-4" />}
              >
                {deferredPrompt
                  ? "Instalar ahora en este dispositivo"
                  : isStandalone
                    ? "Ver cómo instalar en otro equipo"
                    : `Instalar en este ${detectedLabel}`}
              </ActionButton>

              <ActionButton
                variant="secondary"
                size="md"
                onClick={() => void copyLink()}
                icon={
                  copied ? (
                    <Check aria-hidden="true" className="size-4 text-good" />
                  ) : (
                    <Copy aria-hidden="true" className="size-4" />
                  )
                }
              >
                {copied ? "Enlace copiado" : "Copiar enlace"}
              </ActionButton>

              <ActionButton
                variant="secondary"
                size="md"
                onClick={() => void shareLink()}
                icon={<Share2 aria-hidden="true" className="size-4" />}
              >
                Compartir
              </ActionButton>

              <ActionButton
                variant="secondary"
                size="md"
                onClick={downloadQrSvg}
                icon={<Download aria-hidden="true" className="size-4" />}
              >
                Descargar QR (SVG)
              </ActionButton>
            </div>

            {installNotice ? (
              <p
                role="status"
                className="rounded-xl border border-lagoon/50 bg-lagoon-soft px-3.5 py-2.5 text-xs font-medium text-ink"
              >
                {installNotice}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Step-by-step instructions per device family */}
      <div className="rounded-card border border-line bg-elev p-5 card-shadow">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold tracking-wider text-clay uppercase">
              2. Instrucciones por sistema operativo
            </p>
            <h3 className="mt-0.5 font-display text-xl text-ink">
              Cómo instalar en cada tipo de dispositivo
            </h3>
          </div>
          <a
            href="/?install=1&platform=ios"
            target="_blank"
            rel="noopener noreferrer"
            className="tap press lift inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-bg/70 px-3 text-xs font-medium text-ink hover:border-lagoon"
          >
            Ver asistente visual iOS
            <ExternalLink aria-hidden="true" className="size-3.5 text-lagoon" />
          </a>
        </div>

        {/* Device selector pills */}
        <div
          role="group"
          aria-label="Seleccionar tipo de dispositivo"
          className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          <button
            type="button"
            aria-pressed={activeGuide === "android"}
            onClick={() => setActiveGuide("android")}
            className={cx(
              "tap press flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors",
              activeGuide === "android"
                ? "border-lagoon bg-lagoon text-knob"
                : "border-line bg-bg/60 text-ink hover:border-lagoon/50",
            )}
          >
            <Smartphone aria-hidden="true" className="size-4 shrink-0" />
            <span>Android</span>
          </button>

          <button
            type="button"
            aria-pressed={activeGuide === "ios"}
            onClick={() => setActiveGuide("ios")}
            className={cx(
              "tap press flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors",
              activeGuide === "ios"
                ? "border-lagoon bg-lagoon text-knob"
                : "border-line bg-bg/60 text-ink hover:border-lagoon/50",
            )}
          >
            <Tablet aria-hidden="true" className="size-4 shrink-0" />
            <span>iPhone / iPad</span>
          </button>

          <button
            type="button"
            aria-pressed={activeGuide === "desktop"}
            onClick={() => setActiveGuide("desktop")}
            className={cx(
              "tap press flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors",
              activeGuide === "desktop"
                ? "border-lagoon bg-lagoon text-knob"
                : "border-line bg-bg/60 text-ink hover:border-lagoon/50",
            )}
          >
            <Laptop aria-hidden="true" className="size-4 shrink-0" />
            <span>Windows / Mac</span>
          </button>

          <button
            type="button"
            aria-pressed={activeGuide === "other"}
            onClick={() => setActiveGuide("other")}
            className={cx(
              "tap press flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors",
              activeGuide === "other"
                ? "border-lagoon bg-lagoon text-knob"
                : "border-line bg-bg/60 text-ink hover:border-lagoon/50",
            )}
          >
            <MonitorSmartphone aria-hidden="true" className="size-4 shrink-0" />
            <span>Linux / Tablets</span>
          </button>
        </div>

        {/* Active Guide Content */}
        {DEVICE_GUIDES.filter((guide) => guide.id === activeGuide).map((guide) => (
          <div
            key={guide.id}
            className="mt-4 rounded-xl border border-line bg-bg/55 p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h4 className="font-display text-lg text-ink">{guide.title}</h4>
                <p className="text-xs text-muted">{guide.subtitle}</p>
              </div>
              <span className="rounded-full bg-lagoon-soft px-2.5 py-0.5 text-[11px] font-medium text-lagoon">
                {guide.browsers}
              </span>
            </div>

            <ol className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {guide.steps.map((step, index) => (
                <li
                  key={step}
                  className="flex items-start gap-2.5 rounded-xl border border-line/80 bg-elev p-3 text-xs leading-relaxed text-ink"
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-clay text-xs font-bold text-clay-ink">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <p className="mt-3 text-xs text-muted">
              <strong className="text-ink">Consejo:</strong> {guide.tip}
            </p>
          </div>
        ))}
      </div>

      {/* Benefits of installing the Web App */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-card border border-line bg-elev p-4 card-shadow">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Sparkles aria-hidden="true" className="size-4 text-clay" />
            Pantalla completa
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Se abre desde tu icono de inicio sin barras de navegación y con gestos táctiles fluidos.
          </p>
        </div>

        <div className="rounded-card border border-line bg-elev p-4 card-shadow">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Wifi aria-hidden="true" className="size-4 text-lagoon" />
            Ultraligera (&lt; 1 MB)
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            No llena la memoria de tu teléfono y conserva tus viajes guardados en el dispositivo.
          </p>
        </div>

        <div className="rounded-card border border-line bg-elev p-4 card-shadow">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ShieldCheck aria-hidden="true" className="size-4 text-jade" />
            QR 100% privado
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            El código QR se genera localmente en tu navegador sin enviar datos a servicios externos.
          </p>
        </div>
      </div>
    </section>
  );
}
