import { ChevronDown } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { cx } from "@/lib/cx";
import { filterByQuery, firstPrefixMatch } from "@/lib/interactions/search-filter";
import { controlClass } from "./field";

export type ComboOption = {
  value: string;
  label: string;
  /** Secondary line shown under the label and included in the search. */
  description?: string;
  /** Extra searchable text that is not displayed (IATA codes, aliases). */
  keywords?: string[];
};

export type SearchComboboxProps = {
  id: string;
  label: string;
  options: ComboOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Accessible hint below the field. */
  hint?: string;
  emptyMessage?: string;
  className?: string;
};

function optionId(base: string, index: number): string {
  return `${base}-option-${index}`;
}

/**
 * Editable combobox (ARIA 1.2 pattern): a text field filters the list while the
 * user types, ignoring case and diacritics, and the list keeps an active option
 * announced through `aria-activedescendant`.
 *
 * Keyboard: ↑/↓ move, Home/End jump, Enter confirms, Escape closes, Tab leaves.
 * Touch: the whole row is a 44 px control and the chevron opens/closes the list
 * without any gesture requirement.
 */
export function SearchCombobox({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = "Busca por ciudad o aeropuerto",
  hint,
  emptyMessage = "Sin coincidencias. Revisa la ciudad o escribe otro aeropuerto.",
  className,
}: SearchComboboxProps) {
  const listId = `${id}-listbox`;
  const hintId = hint ? `${id}-hint` : undefined;
  const statusId = `${id}-status`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [status, setStatus] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const suppressFocusOpen = useRef(false);

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );
  const filtered = useMemo(
    () =>
      filterByQuery(options, query, (option) => [
        option.label,
        option.description ?? "",
        ...(option.keywords ?? []),
      ]),
    [options, query],
  );

  // Close when the pointer goes anywhere outside, keeping focus predictable.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const node = containerRef.current;
      if (node && !node.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Keep the active option inside the list viewport.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const option = list?.querySelector<HTMLElement>(`#${CSS.escape(optionId(id, activeIndex))}`);
    if (!list || !option) return;
    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top - 4;
    else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight + 4;
    }
  }, [activeIndex, id, open, filtered.length]);

  function openList(nextQuery = "") {
    setOpen(true);
    setQuery(nextQuery);
    const match = firstPrefixMatch(options, nextQuery, (option) => option.label);
    setActiveIndex(
      match === -1
        ? Math.max(
            0,
            options.findIndex((option) => option.value === value),
          )
        : match,
    );
  }

  function closeList() {
    setOpen(false);
    setQuery("");
  }

  function select(option: ComboOption) {
    onChange(option.value);
    closeList();
    setStatus(`${label}: ${option.label}`);
    focusInput();
  }

  /** Focusing our own field must not immediately reopen the list we just closed. */
  function focusInput() {
    suppressFocusOpen.current = true;
    inputRef.current?.focus();
  }

  function move(delta: number) {
    if (filtered.length === 0) return;
    setActiveIndex((current) => Math.max(0, Math.min(filtered.length - 1, current + delta)));
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) openList("");
        else move(1);
        return;
      case "ArrowUp":
        event.preventDefault();
        if (!open) openList("");
        else move(-1);
        return;
      case "Home":
        if (!open) return;
        event.preventDefault();
        setActiveIndex(0);
        return;
      case "End":
        if (!open) return;
        event.preventDefault();
        setActiveIndex(Math.max(0, filtered.length - 1));
        return;
      case "Enter": {
        event.preventDefault();
        if (!open) {
          openList("");
          return;
        }
        const option = filtered[activeIndex];
        if (option) select(option);
        return;
      }
      case "Escape":
        if (!open) return;
        event.preventDefault();
        closeList();
        return;
      case "Tab":
        closeList();
        return;
      default:
        if (!open) openList(event.key.length === 1 ? event.key : "");
    }
  }

  const activeOption = filtered[activeIndex];
  const inputId = id;

  return (
    <div ref={containerRef} className={cx("relative block text-sm", className)}>
      <label htmlFor={inputId} className="mb-1 block text-sm text-muted">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && activeOption ? optionId(id, activeIndex) : undefined}
          aria-describedby={hintId}
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          placeholder={open ? placeholder : undefined}
          value={open ? query : (selected?.label ?? "")}
          onChange={(event) => {
            const raw = event.target.value;
            const shownLabel = selected?.label ?? "";
            // Typing right after a close appends to the label on screen; keep
            // the search term clean instead of matching the old label.
            const next =
              !open && shownLabel && raw.startsWith(shownLabel)
                ? raw.slice(shownLabel.length)
                : raw;
            setOpen(true);
            setQuery(next);
            const match = firstPrefixMatch(options, next, (option) => option.label);
            setActiveIndex(match === -1 ? 0 : match);
          }}
          onClick={() => {
            if (!open) openList("");
          }}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (suppressFocusOpen.current) {
              suppressFocusOpen.current = false;
              return;
            }
            if (!open) openList("");
          }}
          className={cx(controlClass, "pr-12")}
        />
        <button
          type="button"
          aria-label={open ? `Cerrar lista de ${label}` : `Abrir lista de ${label}`}
          aria-expanded={open}
          aria-controls={listId}
          tabIndex={-1}
          onClick={() => {
            if (open) {
              closeList();
              focusInput();
              return;
            }
            openList("");
            focusInput();
          }}
          className="tap press absolute top-0.5 right-0.5 grid size-11 place-items-center rounded-lg text-muted"
        >
          <ChevronDown
            aria-hidden="true"
            className={cx("size-4 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {hintId ? (
        <p id={hintId} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}

      <div className="disclosure-panel" data-open={open} inert={!open}>
        <div className="overflow-hidden">
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={`Opciones de ${label}`}
            className="mt-1 max-h-64 overflow-y-auto overscroll-contain rounded-xl border border-line bg-elev p-1"
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted">{emptyMessage}</p>
            ) : (
              filtered.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;
                return (
                  <div
                    key={option.value}
                    id={optionId(id, index)}
                    role="option"
                    aria-selected={isSelected}
                    data-active={isActive}
                    onPointerDown={(event) => {
                      // Keep focus on the input: the option is not a focus stop.
                      event.preventDefault();
                    }}
                    onClick={() => select(option)}
                    onPointerMove={() => setActiveIndex(index)}
                    className={cx(
                      "option-row tap flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm",
                      isActive ? "bg-lagoon-soft text-ink" : "text-ink",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{option.label}</span>
                      {option.description ? (
                        <span className="block truncate text-xs text-muted">
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                    {isSelected ? (
                      <span className="shrink-0 text-xs font-medium text-lagoon">Elegido</span>
                    ) : isActive ? (
                      <span aria-hidden="true" className="shrink-0 text-xs text-muted">
                        Enter
                      </span>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <p id={statusId} role="status" aria-live="polite" className="sr-only">
        {open
          ? filtered.length === 0
            ? emptyMessage
            : `${filtered.length} ${filtered.length === 1 ? "opción disponible" : "opciones disponibles"}`
          : status}
      </p>
    </div>
  );
}
