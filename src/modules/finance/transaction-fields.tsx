"use client";

import { Camera, Repeat2, X } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { Label, Select } from "@/components/ui/field";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "./icons";
import { TRANSACTION_TYPE_LABELS, type Account, type Category, type Template, type Transaction } from "./types";

/** Piezas de la hoja de movimiento. */

export function Chip({
  pressed,
  onClick,
  children,
  className,
}: {
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "flex h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-etiqueta transition-colors duration-120 ease-boveda",
        pressed ? "border-laton text-texto" : "border-borde-control text-texto-2 hover:text-texto",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** "Repetir último" y las plantillas, en una fila que se desliza. */
export function QuickChips({
  last,
  templates,
  categoryName,
  onRepeat,
  onTemplate,
}: {
  last: Transaction | null;
  templates: Template[];
  categoryName: (id: string | null) => string | undefined;
  onRepeat: () => void;
  onTemplate: (template: Template) => void;
}) {
  if (!last && templates.length === 0) return null;
  return (
    <div role="group" aria-label="Atajos" className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:-mx-6 lg:px-6">
      {last ? (
        <Chip onClick={onRepeat}>
          <Repeat2 aria-hidden className="size-4" />
          Repetir último:
          <span className="cifras text-texto">{formatMoney(last.amountCents, last.currency)}</span>
          {categoryName(last.categoryId) ?? TRANSACTION_TYPE_LABELS[last.type]}
        </Chip>
      ) : null}
      {templates.map((template) => (
        <Chip key={template.id} onClick={() => onTemplate(template)}>
          {template.name}
          {template.amountCents !== null ? (
            <span className="cifras text-texto">{formatMoney(template.amountCents, template.currency)}</span>
          ) : null}
        </Chip>
      ))}
    </div>
  );
}

/** Cuadrícula de categorías con íconos grandes y, si tiene, sus subcategorías. */
export function CategoryPicker({
  categories,
  type,
  value,
  invalid,
  onChange,
}: {
  categories: Category[];
  type: "gasto" | "ingreso";
  value: string | null;
  invalid: boolean;
  onChange: (id: string) => void;
}) {
  const selected = categories.find((category) => category.id === value);
  const rootId = selected?.parentId ?? selected?.id ?? null;
  const roots = categories.filter(
    (category) => category.type === type && category.parentId === null && (!category.archived || category.id === rootId),
  );
  const children = rootId
    ? categories.filter((category) => category.parentId === rootId && (!category.archived || category.id === value))
    : [];

  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label="Categoría" className="grid grid-cols-4 gap-1.5">
        {roots.map((category) => (
          <button
            key={category.id}
            type="button"
            aria-pressed={rootId === category.id}
            onClick={() => onChange(category.id)}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 rounded-control border px-1 py-1.5 text-center text-nota leading-tight transition-colors duration-120 ease-boveda",
              rootId === category.id ? "border-laton bg-superficie text-texto" : "border-borde text-texto-2 hover:text-texto",
              invalid && rootId === null && "border-negativo",
            )}
          >
            <CategoryIcon name={category.icon} className={rootId === category.id ? "text-laton" : undefined} />
            <span className="line-clamp-2 break-words">{category.name}</span>
          </button>
        ))}
      </div>
      {children.length > 0 && rootId ? (
        <div role="group" aria-label="Subcategoría (opcional)" className="flex flex-wrap gap-2">
          {children.map((child) => (
            <Chip
              key={child.id}
              pressed={value === child.id}
              onClick={() => onChange(value === child.id ? rootId : child.id)}
            >
              {child.name}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TransferAccounts({
  accounts,
  from,
  to,
  onFrom,
  onTo,
}: {
  accounts: Account[];
  from: string | null;
  to: string | null;
  onFrom: (id: string) => void;
  onTo: (id: string) => void;
}) {
  if (accounts.length < 2) {
    return (
      <p className="text-interfaz text-texto-2">
        Para transferir necesitas dos cuentas. Agrega otra en Finanzas → Cuentas.
      </p>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cuenta-origen">Sale de</Label>
        <Select id="cuenta-origen" value={from ?? ""} onChange={(event) => onFrom(event.target.value)}>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} · {account.currency}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cuenta-destino">Entra a</Label>
        <Select id="cuenta-destino" value={to ?? ""} onChange={(event) => onTo(event.target.value)}>
          {accounts
            .filter((account) => account.id !== from)
            .map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} · {account.currency}
              </option>
            ))}
        </Select>
      </div>
    </div>
  );
}

/** Foto del ticket: tomarla o elegirla, verla y quitarla. */
export function PhotoField({
  previewUrl,
  busy,
  onPick,
  onRemove,
  label = "Foto del ticket",
}: {
  previewUrl: string | null;
  busy: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-etiqueta font-medium text-texto-2">{label}</span>
      {previewUrl ? (
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- foto local del dispositivo */}
          <img src={previewUrl} alt={label} className="max-h-48 rounded-control border border-borde object-contain" />
          <button
            type="button"
            onClick={onRemove}
            aria-label="Quitar foto"
            className="grid size-11 place-items-center rounded-control text-texto-2 hover:bg-elevada hover:text-texto"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
      ) : (
        <Chip onClick={() => input.current?.click()} className="self-start">
          <Camera aria-hidden className="size-4" />
          {busy ? "Procesando foto…" : "Agregar foto"}
        </Chip>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label={`Elegir ${label.toLowerCase()}`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
