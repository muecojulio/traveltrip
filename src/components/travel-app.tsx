import { Link } from "@tanstack/react-router";
import { Bookmark, Compass, Moon, Plane, ShieldCheck, SunMedium } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActionButton } from "@/components/interactions/action-button";
import { LiveStatus } from "@/components/interactions/live-status";
import { SectionTabBar, type SectionTabItem } from "@/components/interactions/section-tabs";
import { HeroPanoramaSvg, PapelPicadoStrip } from "@/components/travel/mexican-art";
import { SavedPanel } from "@/components/travel/saved-panel";
import { SearchPanel } from "@/components/travel/search-panel";
import {
  mexicoDate,
  quoteId,
  type Saved,
  type SearchParams,
} from "@/components/travel/travel-model";
import { TripPanel } from "@/components/travel/trip-panel";
import { DESTINATIONS, groundByName } from "@/lib/travel/catalog";
import { searchTrip } from "@/lib/travel/search-fn";
import { sanitizeSavedTrips } from "@/lib/travel/security";
import type { Quote } from "@/lib/travel/types";
import { sectionPanelId, sectionTabId } from "@/lib/interactions/dom-ids";
import { useActionFeedback } from "@/lib/interactions/use-action-feedback";
import { usePanelSwipe } from "@/lib/interactions/use-panel-swipe";

type Tab = "buscar" | "viaje" | "guardados";

export const SAVED_KEY = "traveltrip-saved";
const TAB_ORDER: Tab[] = ["buscar", "viaje", "guardados"];
const ID_PREFIX = "section";

const TABS: SectionTabItem[] = [
  { id: "buscar", label: "Buscar", icon: <Compass aria-hidden="true" className="size-5" /> },
  { id: "viaje", label: "Viaje", icon: <Plane aria-hidden="true" className="size-5" /> },
  { id: "guardados", label: "Guardados", icon: <Bookmark aria-hidden="true" className="size-5" /> },
];

/** Same Mexico City based defaults the app always used (server/client agree). */
function initialParams(): SearchParams {
  return {
    destinationId: "cuernavaca",
    customCity: "",
    originIata: "MEX",
    checkIn: mexicoDate(21),
    checkOut: mexicoDate(23),
    adults: 2,
    cabinOnly: true,
    arriveBy14: true,
  };
}

export function TravelApp() {
  const [tab, setTab] = useState<Tab>("buscar");
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [themeReady, setThemeReady] = useState(false);
  const [params, setParams] = useState<SearchParams>(initialParams);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [selectedHotelName, setSelectedHotelName] = useState("");
  const [saved, setSaved] = useState<Saved[]>([]);
  const lastError = useRef("");
  const pendingPanelFocus = useRef(false);
  const panelRefs = useRef(new Map<Tab, HTMLDivElement | null>());

  const search = useActionFeedback();
  const refresh = useActionFeedback();
  const save = useActionFeedback();

  const destination = DESTINATIONS.find((item) => item.id === params.destinationId);
  const flightLikely = destination
    ? !destination.groundOnly
    : params.destinationId === "custom"
      ? !groundByName(params.customCity)
      : true;
  const searchReady =
    Boolean(params.checkIn && params.checkOut && params.checkOut > params.checkIn) &&
    (params.destinationId !== "custom" || params.customCity.trim().length >= 3);
  const savedIds = useMemo(() => new Set(saved.map((item) => item.id)), [saved]);

  useEffect(() => {
    const storedTheme = localStorage.getItem("traveltrip-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
      document.documentElement.dataset.theme = storedTheme;
    }
    setThemeReady(true);
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      if (raw) {
        setSaved(sanitizeSavedTrips<Saved>(JSON.parse(raw)));
      }
    } catch {
      setSaved([]);
    }
  }, []);

  useEffect(() => {
    if (!themeReady) return;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("traveltrip-theme", theme);
  }, [theme, themeReady]);

  useEffect(() => {
    if (!pendingPanelFocus.current) return;
    pendingPanelFocus.current = false;
    panelRefs.current.get(tab)?.focus();
  }, [tab]);

  function selectTab(next: Tab, options: { focusPanel?: boolean } = {}) {
    setDirection(TAB_ORDER.indexOf(next) >= TAB_ORDER.indexOf(tab) ? "forward" : "backward");
    setTab(next);
    pendingPanelFocus.current = Boolean(options.focusPanel);
  }

  const swipe = usePanelSwipe({
    index: TAB_ORDER.indexOf(tab),
    count: TAB_ORDER.length,
    onSwipe: (swipeDirection) => {
      const nextIndex = TAB_ORDER.indexOf(tab) + (swipeDirection === "forward" ? 1 : -1);
      const next = TAB_ORDER[nextIndex];
      if (!next) return;
      setDirection(swipeDirection);
      setTab(next);
    },
  });

  function persist(next: Saved[]) {
    const safeNext = next.slice(0, 8);
    setSaved(safeNext);
    localStorage.setItem(SAVED_KEY, JSON.stringify(safeNext));
  }

  async function executeSearch(forceRefresh = false): Promise<boolean> {
    setError("");
    try {
      const result = await searchTrip({
        data: {
          destinationId: params.destinationId,
          customCity: params.destinationId === "custom" ? params.customCity.trim() : "",
          originIata: params.originIata,
          checkIn: params.checkIn,
          checkOut: params.checkOut,
          adults: params.adults,
          cabinOnly: params.cabinOnly,
          arriveBy14: params.arriveBy14,
          forceRefresh,
        },
      });
      if (!result.ok) {
        lastError.current = result.message;
        setError(result.message);
        return false;
      }
      setQuote(result.quote);
      setSelectedHotelName(result.quote.best?.hotelName ?? result.quote.hotels[0]?.name ?? "");
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo buscar.";
      lastError.current = message;
      setError(message);
      return false;
    }
  }

  function onSearch() {
    void search.run(
      async () => {
        lastError.current = "";
        const ok = await executeSearch(false);
        if (ok) selectTab("viaje", { focusPanel: true });
        return ok;
      },
      {
        loading: "Buscando precios en vivo…",
        success: "Precio listo. El total quedó en la sección Viaje.",
        get error() {
          return lastError.current || "No se pudo completar la búsqueda.";
        },
      },
    );
  }

  function onRefresh() {
    void refresh.run(
      async () => {
        lastError.current = "";
        return executeSearch(true);
      },
      {
        loading: "Actualizando precios en vivo…",
        success: "Precios actualizados.",
        get error() {
          return lastError.current || "No se pudieron actualizar los precios.";
        },
      },
    );
  }

  function saveQuote(current: Quote, hotelName: string) {
    const id = quoteId(current, hotelName);
    if (savedIds.has(id)) return;
    persist([{ id, quote: current, selectedHotelName: hotelName }, ...saved].slice(0, 8));
  }

  function onSave() {
    if (!quote) return;
    void save.run(
      () => {
        saveQuote(quote, selectedHotelName);
        return true;
      },
      {
        loading: "Guardando…",
        success: "Viaje guardado en este dispositivo.",
        error: "No se pudo guardar el viaje.",
      },
    );
  }

  function openSaved(item: Saved) {
    setQuote(item.quote);
    setSelectedHotelName(
      item.selectedHotelName ?? item.quote.best?.hotelName ?? item.quote.hotels[0]?.name ?? "",
    );
    selectTab("viaje", { focusPanel: true });
  }

  const statusMessage = search.message || refresh.message || save.message;
  const destinationLabel = destination
    ? destination.iata
      ? `${destination.city} (${destination.iata})`
      : destination.city
    : params.customCity.trim() || "México";

  return (
    <div className="min-h-screen text-ink">
      <PapelPicadoStrip />

      <div className="mx-auto max-w-3xl">
        <header className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <span
                  className="relative grid size-9 place-items-center rounded-xl border border-clay/40 bg-clay/15"
                  aria-hidden="true"
                >
                  <span className="size-3.5 rounded-full bg-clay" />
                  <span className="absolute right-1 bottom-1 size-2 rounded-full bg-marigold" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-display text-2xl leading-none">TravelTrip</p>
                    <span className="rounded-full bg-lagoon-soft px-2 py-0.5 text-[10px] font-semibold tracking-wider text-lagoon uppercase">
                      México Vivo
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted sm:text-sm">
                    Hotel en vivo + vuelo redondo antes de las 2 pm con maleta confirmada
                  </p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                to="/privacidad"
                className="tap press lift hidden min-h-10 items-center gap-1.5 rounded-full border border-line bg-elev px-3 text-xs font-medium text-ink sm:inline-flex"
              >
                <ShieldCheck aria-hidden="true" className="size-3.5 text-lagoon" />
                Privacidad
              </Link>
              <ActionButton
                size="icon"
                variant="secondary"
                label={theme === "dark" ? "Tema claro" : "Tema oscuro"}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-full"
              >
                {theme === "dark" ? (
                  <SunMedium aria-hidden="true" className="size-5 text-marigold" />
                ) : (
                  <Moon aria-hidden="true" className="size-5 text-lagoon" />
                )}
              </ActionButton>
            </div>
          </div>

          <div className="mt-3">
            <HeroPanoramaSvg
              originIata={params.originIata}
              destinationCode={destinationLabel}
              flightMode={flightLikely}
            />
          </div>
        </header>

        <LiveStatus message={statusMessage} />

        <div className="px-4 pb-28">
          <div ref={swipe.containerRef} className="panel-swipe" {...swipe.containerProps}>
            <div
              role="tabpanel"
              id={sectionPanelId(ID_PREFIX, "buscar")}
              aria-labelledby={sectionTabId(ID_PREFIX, "buscar")}
              tabIndex={-1}
              hidden={tab !== "buscar"}
              ref={(node) => {
                panelRefs.current.set("buscar", node);
              }}
              className={tab === "buscar" ? "panel-enter space-y-4" : undefined}
              data-direction={direction}
            >
              <SearchPanel
                params={params}
                onChange={(patch) => {
                  setParams((current) => ({ ...current, ...patch }));
                  setError("");
                }}
                onSearch={onSearch}
                flightLikely={flightLikely}
                searchReady={searchReady}
                error={error}
                searchState={search.state}
              />
            </div>

            <div
              role="tabpanel"
              id={sectionPanelId(ID_PREFIX, "viaje")}
              aria-labelledby={sectionTabId(ID_PREFIX, "viaje")}
              tabIndex={-1}
              hidden={tab !== "viaje"}
              ref={(node) => {
                panelRefs.current.set("viaje", node);
              }}
              className={tab === "viaje" ? "panel-enter space-y-4" : undefined}
              data-direction={direction}
            >
              <TripPanel
                quote={quote}
                loading={search.state === "loading" || refresh.state === "loading"}
                refreshState={refresh.state}
                saveState={save.state}
                onRefresh={onRefresh}
                onSave={onSave}
                onSelectHotel={setSelectedHotelName}
                selectedHotelName={selectedHotelName}
                saved={quote ? savedIds.has(quoteId(quote, selectedHotelName)) : false}
              />
            </div>

            <div
              role="tabpanel"
              id={sectionPanelId(ID_PREFIX, "guardados")}
              aria-labelledby={sectionTabId(ID_PREFIX, "guardados")}
              tabIndex={-1}
              hidden={tab !== "guardados"}
              ref={(node) => {
                panelRefs.current.set("guardados", node);
              }}
              className={tab === "guardados" ? "panel-enter space-y-4" : undefined}
              data-direction={direction}
            >
              <SavedPanel
                saved={saved}
                onRemove={(id) => persist(saved.filter((row) => row.id !== id))}
                onClear={() => persist([])}
                onOpen={openSaved}
              />
            </div>
          </div>
        </div>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-bg/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
        aria-label="Navegación principal"
      >
        <div className="mx-auto max-w-3xl">
          <SectionTabBar
            items={TABS}
            value={tab}
            onChange={(id) => selectTab(id as Tab)}
            label="Secciones"
            idPrefix={ID_PREFIX}
          />
        </div>
      </nav>
    </div>
  );
}
