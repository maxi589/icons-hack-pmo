"use client";

import { Fragment, useEffect, useRef, type ReactNode } from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { play } from "@/lib/sounds";

// Eigenes Auswahlfeld statt <select>: gleiche Liste in Edge, Chrome, Safari und am Handy, hell und dunkel,
// ohne weißes Aufblitzen der Windows-Liste. Leerer Wert "" = „Keiner/Offen“ (eigene Option in `options`).

export type SelectOption = {
  value: string;
  label: string;
  /** Überschrift einer Gruppe (z. B. „Firmen“). Optionen derselben Gruppe stehen zusammen. */
  group?: string;
  /** Unterpunkt, eingerückt (z. B. M1.1 unter M1). */
  indent?: boolean;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  id?: string;
  "aria-label"?: string;
  /** Klassen für das Feld selbst (Höhe, Rand, Schrift). */
  className?: string;
  /** Text, wenn der Wert in keiner Option vorkommt. */
  placeholder?: string;
  /** Etwas vor dem Wert im Feld, z. B. der Punkt der Stufe. */
  leading?: ReactNode;
  /** Pfeil ausblenden (z. B. wenn das Feld wie Text aussehen soll). */
  hideChevron?: boolean;
  chevronClassName?: string;
  /** Suchfeld oben in der Liste (für lange Listen wie die 114 Firmen); ohne Gruppen. */
  searchable?: boolean;
  /** Eigene Anzeige des gewählten Werts im Feld (z. B. „A“ als Kästchen in der Tabelle); die Liste bleibt gleich. Nicht bei `searchable`. */
  renderValue?: (value: string) => ReactNode;
};

// Ein Klick neben die offene Liste soll nur die Liste schließen, nicht auch den Dialog bzw. das Sheet dahinter.
// Dialog und Sheet fragen deshalb `selectWasOpen()`, bevor sie auf einen Klick außerhalb reagieren.
let openCount = 0;
let lastClose = 0;
export const selectWasOpen = () => openCount > 0 || Date.now() - lastClose < 400;

function useOpenTracker() {
  const isOpen = useRef(false);
  const setOpen = (open: boolean) => {
    if (open === isOpen.current) return;
    isOpen.current = open;
    openCount += open ? 1 : -1;
    if (!open) lastClose = Date.now();
  };
  // Wird das Feld offen abgebaut (Dialog zu), zählt es nicht mehr als offen.
  useEffect(() => () => setOpen(false), []);
  return setOpen;
}

const triggerCls = cn(
  "group/select flex min-w-0 cursor-pointer items-center gap-2 text-left outline-none select-none",
  "transition-colors duration-150 ease-out focus-visible:outline-solid data-popup-open:bg-hover"
);
const popupCls = cn(
  "flex max-h-[min(var(--available-height),340px)] min-w-(--anchor-width) max-w-[min(440px,var(--available-width))] origin-(--transform-origin) flex-col",
  "overflow-hidden rounded-xl bg-card text-fg shadow-[0_0_0_1px_var(--line2),0_12px_32px_rgba(0,0,0,0.18)] outline-none dark:shadow-[0_0_0_1px_var(--line2),0_12px_32px_rgba(0,0,0,0.55)]",
  "transition-[opacity,scale,translate] duration-150 ease-out",
  "data-starting-style:-translate-y-1 data-starting-style:scale-[0.98] data-starting-style:opacity-0",
  "data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-ending-style:duration-100"
);
const listCls = "min-h-0 flex-1 scroll-py-1 overflow-y-auto overscroll-contain p-1 [scrollbar-color:var(--line2)_transparent] [scrollbar-width:thin]";
const itemCls = cn(
  "flex min-h-8 cursor-pointer items-center gap-2 rounded-lg py-1.5 pr-2 pl-2.5 text-[13px] leading-snug text-fg-2 outline-none select-none",
  "data-highlighted:bg-active data-highlighted:text-fg data-selected:font-medium data-selected:text-fg",
  "max-md:min-h-11 max-md:text-[15px]"
);

export function Select(props: Props) {
  if (props.searchable) return <SearchSelect {...props} />;
  return <PlainSelect {...props} />;
}

function PlainSelect({ value, onChange, options, id, className, placeholder = "–", leading, hideChevron, chevronClassName, renderValue, ...rest }: Props) {
  const setOpen = useOpenTracker();
  const label = options.find((o) => o.value === value)?.label;
  // Gruppen in Reihenfolge des ersten Auftretens
  const groups: { name?: string; items: SelectOption[] }[] = [];
  for (const o of options) {
    const last = groups[groups.length - 1];
    if (last && last.name === o.group) last.items.push(o);
    else groups.push({ name: o.group, items: [o] });
  }

  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={(v) => {
        if (typeof v !== "string" || v === value) return;
        play("toggle");
        onChange(v);
      }}
      onOpenChange={setOpen}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={rest["aria-label"]}
        data-sound="none"
        className={cn(triggerCls, className)}
      >
        {leading}
        <SelectPrimitive.Value className={cn("min-w-0 grow truncate", label === undefined && "text-fg-3")}>
          {() => (renderValue ? renderValue(value) : (label ?? placeholder))}
        </SelectPrimitive.Value>
        {!hideChevron && (
          <SelectPrimitive.Icon
            className={cn(
              "flex shrink-0 text-fg-3 transition-transform duration-150 ease-out group-data-popup-open/select:rotate-180",
              chevronClassName
            )}
          >
            <ChevronDown className="size-3.5" aria-hidden />
          </SelectPrimitive.Icon>
        )}
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          alignItemWithTrigger={false}
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={8}
          className="isolate z-[60] outline-none"
        >
          <SelectPrimitive.Popup data-sound="none" className={popupCls}>
            <SelectPrimitive.List className={listCls}>
              {groups.map((g, i) => {
                const items = g.items.map((o) => (
                  <SelectPrimitive.Item key={o.value} value={o.value} className={cn(itemCls, o.indent && "pl-6")}>
                    <SelectPrimitive.ItemText className="line-clamp-2 min-w-0 flex-1">{o.label}</SelectPrimitive.ItemText>
                    <SelectPrimitive.ItemIndicator className="flex shrink-0 text-acc-line">
                      <Check className="size-3.5" aria-hidden />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                ));
                if (!g.name) return <Fragment key={`_${i}`}>{items}</Fragment>;
                return (
                  <SelectPrimitive.Group key={g.name} className={cn(i > 0 && "mt-1 border-t border-line pt-1")}>
                    <SelectPrimitive.GroupLabel className="label-mono px-2.5 pt-1.5 pb-1 text-[10.5px] text-fg-3 select-none">
                      {g.name}
                    </SelectPrimitive.GroupLabel>
                    {items}
                  </SelectPrimitive.Group>
                );
              })}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

// Auswahl mit Suchfeld (Base UI Combobox, Suchfeld oben in der Liste). Gleiche Optik wie oben, Werte bleiben Text.
function SearchSelect({ value, onChange, options, id, className, placeholder = "–", leading, hideChevron, chevronClassName, ...rest }: Props) {
  const setOpen = useOpenTracker();
  const selected = options.find((o) => o.value === value) ?? null;

  return (
    <Combobox.Root
      items={options}
      value={selected}
      onValueChange={(o) => {
        const v = (o as SelectOption | null)?.value ?? "";
        if (v === value) return;
        play("toggle");
        onChange(v);
      }}
      onOpenChange={setOpen}
      isItemEqualToValue={(a, b) => (a as SelectOption).value === (b as SelectOption).value}
      locale="de"
      autoHighlight
    >
      <Combobox.Trigger id={id} aria-label={rest["aria-label"]} data-sound="none" className={cn(triggerCls, className)}>
        {leading}
        <span className={cn("min-w-0 grow truncate", !selected && "text-fg-3")}>{selected?.label ?? placeholder}</span>
        {!hideChevron && (
          <Combobox.Icon
            className={cn(
              "flex shrink-0 text-fg-3 transition-transform duration-150 ease-out group-data-popup-open/select:rotate-180",
              chevronClassName
            )}
          >
            <ChevronDown className="size-3.5" aria-hidden />
          </Combobox.Icon>
        )}
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner side="bottom" align="start" sideOffset={4} collisionPadding={8} className="isolate z-[60] outline-none">
          <Combobox.Popup data-sound="none" aria-label={rest["aria-label"] ?? "Auswahl"} className={popupCls}>
            <div className="flex items-center gap-2 border-b border-line px-3">
              <Search className="size-3.5 shrink-0 text-fg-3" aria-hidden />
              <Combobox.Input
                placeholder="Suchen …"
                className="h-9 min-w-0 flex-1 bg-transparent text-[13px] text-fg outline-none placeholder:text-fg-3 max-md:h-11"
              />
            </div>
            <Combobox.Empty className="px-3 py-2.5 text-[13px] text-fg-3 empty:hidden">Keine Treffer.</Combobox.Empty>
            <Combobox.List className={listCls}>
              {(o: SelectOption) => (
                <Combobox.Item key={o.value} value={o} className={itemCls}>
                  <span className="line-clamp-2 min-w-0 flex-1">{o.label}</span>
                  <Combobox.ItemIndicator className="flex shrink-0 text-acc-line">
                    <Check className="size-3.5" aria-hidden />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
