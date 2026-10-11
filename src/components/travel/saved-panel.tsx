import { Trash2 } from "lucide-react";
import { ActionButton } from "@/components/interactions/action-button";
import { SwipeReveal } from "@/components/interactions/swipe-reveal";
import { money, savedCombo, type Saved } from "./travel-model";

export type SavedPanelProps = {
  saved: Saved[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onOpen: (item: Saved) => void;
};

/**
 * Saved trips. Each card can be swiped horizontally to reveal its actions, but
 * a visible "Acciones" button opens the same panel for keyboard, touch and
 * mouse users — the gesture is never the only path.
 */
export function SavedPanel({ saved, onRemove, onClear, onOpen }: SavedPanelProps) {
  return (
    <section className="space-y-3">
      {saved.length === 0 ? (
        <p className="rounded-card border border-line bg-elev px-4 py-6 text-sm text-muted">
          Todavía no guardas un viaje. Busca un destino y márcalo.
        </p>
      ) : (
        <div className="stagger space-y-3">
          {saved.map((item) => {
            const combo = savedCombo(item);
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
                  <h2 className="font-display text-2xl">{item.quote.place}</h2>
                  <p className="text-sm text-muted">
                    {item.quote.checkIn} → {item.quote.checkOut}
                  </p>
                  <p className="mt-2 text-lg">{combo ? money(combo.totalMxn) : "Sin total"}</p>
                  {item.selectedHotelName ? (
                    <p className="text-xs text-muted">{item.selectedHotelName}</p>
                  ) : null}
                  <ActionButton
                    variant="ghost"
                    size="md"
                    className="mt-2 px-0"
                    onClick={() => onOpen(item)}
                  >
                    Ver detalle
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
        Borrar todo lo guardado en este teléfono
      </ActionButton>
    </section>
  );
}
