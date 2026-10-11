import { Bookmark, CalendarDays, Compass, Sparkles, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/interactions/action-button";
import { SwipeReveal } from "@/components/interactions/swipe-reveal";
import { money, savedCombo, type Saved } from "./travel-model";

type SavedPanelProps = {
  saved: Saved[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onOpen: (item: Saved) => void;
};

export function SavedPanel({ saved, onRemove, onClear, onOpen }: SavedPanelProps) {
  const bestSavedTotal = saved.reduce<number | null>((lowest, item) => {
    const combo = savedCombo(item);
    if (!combo) return lowest;
    return lowest === null || combo.totalMxn < lowest ? combo.totalMxn : lowest;
  }, null);

  return (
    <section className="space-y-4">
      <div className="rounded-card border border-line bg-elev p-4 card-shadow">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-full bg-clay/15 text-clay">
              <Bookmark aria-hidden="true" className="size-4" />
            </span>
            <div>
              <h2 className="font-display text-xl leading-tight text-ink">
                Mis viajes guardados
              </h2>
              <p className="text-xs text-muted">
                Guardados únicamente en este navegador · Máximo 8 comparaciones
              </p>
            </div>
          </div>
          {bestSavedTotal !== null ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-lagoon-soft px-3 py-1 text-xs font-semibold text-lagoon">
              <Sparkles aria-hidden="true" className="size-3.5" />
              Desde {money(bestSavedTotal)}
            </span>
          ) : null}
        </div>
      </div>

      {saved.length === 0 ? (
        <div className="rounded-card border border-line bg-elev px-4 py-8 text-center card-shadow">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-lagoon-soft text-lagoon">
            <Compass aria-hidden="true" className="size-6" />
          </span>
          <p className="mt-3 font-display text-xl text-ink">Todavía no guardas un viaje</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Cotiza cualquier destino y toca el icono de marcador para comparar tus opciones
            favoritas aquí mismo.
          </p>
        </div>
      ) : (
        <div className="stagger space-y-3">
          {saved.map((item) => {
            const combo = savedCombo(item);
            const isCheapest =
              combo !== null && bestSavedTotal !== null && combo.totalMxn === bestSavedTotal;
            return (
              <SwipeReveal
                key={item.id}
                actionsLabel={`Acciones de ${item.quote.place}`}
                actions={
                  <ActionButton
                    variant="danger"
                    onClick={() => onRemove(item.id)}
                    icon={<Trash2 aria-hidden="true" className="size-4" />}
                  >
                    Quitar
                  </ActionButton>
                }
              >
                <article className="p-4 pr-24">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-lagoon-soft px-2 py-0.5 text-[10px] font-semibold text-lagoon">
                      {item.quote.state}
                    </span>
                    {isCheapest && saved.length > 1 ? (
                      <span className="rounded-full bg-clay/15 px-2 py-0.5 text-[10px] font-semibold text-clay">
                        Opción más barata guardada
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-1.5 font-display text-2xl text-ink">{item.quote.place}</h3>
                  <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted">
                    <CalendarDays aria-hidden="true" className="size-3.5 text-lagoon" />
                    {item.quote.checkIn} → {item.quote.checkOut} ({item.quote.nights}{" "}
                    {item.quote.nights === 1 ? "noche" : "noches"})
                  </p>
                  <p className="mt-2 font-display text-2xl text-ink">
                    {combo ? money(combo.totalMxn) : "Sin total"}
                  </p>
                  {item.selectedHotelName ? (
                    <p className="mt-0.5 text-xs text-muted">Hotel: {item.selectedHotelName}</p>
                  ) : null}
                  <ActionButton
                    variant="ghost"
                    size="md"
                    className="mt-2 px-0"
                    onClick={() => onOpen(item)}
                  >
                    Abrir cotización completa →
                  </ActionButton>
                </article>
              </SwipeReveal>
            );
          })}
        </div>
      )}

      <ActionButton
        variant="ghost"
        size="md"
        onClick={onClear}
        disabled={saved.length === 0}
        className="underline"
      >
        Borrar todo lo guardado en este dispositivo
      </ActionButton>
    </section>
  );
}
