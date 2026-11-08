"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { Sheet } from "@/components/ui/sheet";
import { showToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { nextOrder, putCategory, useCategories } from "./data";
import { CATEGORY_ICONS, CategoryIcon } from "./icons";
import { BUDGET_GROUPS, type Category, type CategoryType } from "./types";

const GROUP_LABELS: Record<(typeof BUDGET_GROUPS)[number], string> = {
  necesidades: "Necesidades",
  deseos: "Deseos",
  ahorro: "Ahorro e inversión",
};

type Editing = { kind: "nueva"; type: CategoryType } | { kind: "editar"; category: Category };

const SECTIONS: { type: CategoryType; title: string }[] = [
  { type: "gasto", title: "Gastos" },
  { type: "ingreso", title: "Ingresos" },
];

/** Categorías de gastos e ingresos: se renombran, cambian de ícono o se archivan. */
export function CategoriesView() {
  const categories = useCategories();
  const [editing, setEditing] = useState<Editing | null>(null);
  if (!categories) return null;

  return (
    <>
      <p className="max-w-[65ch] text-interfaz text-texto-2">
        Las categorías archivadas ya no aparecen al registrar, pero tus movimientos anteriores las conservan.
      </p>
      {SECTIONS.map((section) => {
        const list = categories.filter((category) => category.type === section.type);
        // Cada subcategoría va justo debajo de su categoría madre.
        const ordered = list
          .filter((category) => category.parentId === null)
          .flatMap((parent) => [parent, ...list.filter((child) => child.parentId === parent.id)]);
        const active = ordered.filter((category) => !category.archived);
        const archived = ordered.filter((category) => category.archived);
        return (
          <Panel
            key={section.type}
            title={section.title}
            action={
              <Button variant="fantasma" onClick={() => setEditing({ kind: "nueva", type: section.type })}>
                <Plus aria-hidden className="size-5" />
                Agregar
              </Button>
            }
          >
            <CategoryList categories={active} onOpen={(category) => setEditing({ kind: "editar", category })} />
            {section.type === "gasto" ? (
              <p className="text-etiqueta text-texto-2">
                Toca una categoría para cambiar su grupo de la plantilla 50/30/20 o agregarle subcategorías.
              </p>
            ) : null}
            {archived.length > 0 ? (
              <details className="flex flex-col gap-2">
                <summary className="flex min-h-11 cursor-pointer items-center text-interfaz text-texto-2 hover:text-texto">
                  Archivadas ({archived.length})
                </summary>
                <CategoryList categories={archived} onOpen={(category) => setEditing({ kind: "editar", category })} />
              </details>
            ) : null}
          </Panel>
        );
      })}

      {editing ? (
        <CategorySheet
          editing={editing}
          categories={categories}
          order={nextOrder(categories)}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}

function CategoryList({ categories, onOpen }: { categories: Category[]; onOpen: (category: Category) => void }) {
  return (
    <ul className="grid gap-1 sm:grid-cols-2">
      {categories.map((category) => (
        <li key={category.id}>
          <button
            type="button"
            onClick={() => onOpen(category)}
            className={cn(
              "flex min-h-12 w-full items-center gap-3 rounded-control px-2 text-left text-interfaz transition-colors duration-120 ease-boveda hover:bg-elevada",
              category.parentId !== null && "pl-8 text-texto-2",
            )}
          >
            <CategoryIcon name={category.icon} className="text-texto-2" />
            <span className="truncate">{category.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function CategorySheet({
  editing,
  categories,
  order,
  onClose,
}: {
  editing: Editing;
  categories: Category[];
  order: number;
  onClose: () => void;
}) {
  const current = editing.kind === "editar" ? editing.category : null;
  const type = current?.type ?? (editing.kind === "nueva" ? editing.type : "gasto");
  const [name, setName] = useState(current?.name ?? "");
  const [icon, setIcon] = useState(current?.icon ?? "ellipsis");
  const [parentId, setParentId] = useState<string | null>(current?.parentId ?? null);
  const [group, setGroup] = useState<Category["group"]>(current?.group ?? null);
  const [error, setError] = useState<string | null>(null);
  // Solo un nivel: una categoría con subcategorías no puede volverse subcategoría.
  const hasChildren = current ? categories.some((category) => category.parentId === current.id) : false;
  const parents = categories.filter(
    (category) => category.type === type && category.parentId === null && !category.archived && category.id !== current?.id,
  );
  const parentGroup = categories.find((category) => category.id === parentId)?.group ?? null;

  async function save(archived = current?.archived ?? false) {
    const trimmed = name.trim();
    if (trimmed === "") return setError("Escribe el nombre de la categoría.");
    const category: Category = {
      id: current?.id ?? crypto.randomUUID(),
      type,
      name: trimmed.slice(0, 30),
      icon,
      parentId,
      // Una subcategoría usa el grupo de su madre.
      group: type === "gasto" ? (parentId ? parentGroup : group) : null,
      archived,
      order: current?.order ?? order,
    };
    try {
      await putCategory(category);
    } catch {
      return setError("No se pudo guardar. Vuelve a intentar.");
    }
    onClose();
    showToast({
      message:
        current && archived !== current.archived
          ? archived
            ? `${category.name} archivada`
            : `${category.name} activa otra vez`
          : "Categoría guardada",
    });
  }

  return (
    <Sheet
      title={current ? "Editar categoría" : type === "gasto" ? "Nueva categoría de gasto" : "Nueva categoría de ingreso"}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-2">
          {error ? <FormMessage>{error}</FormMessage> : null}
          <Button size="lg" className="w-full" onClick={() => void save()}>
            Guardar categoría
          </Button>
          {current ? (
            <Button variant="fantasma" className="w-full" onClick={() => void save(!current.archived)}>
              {current.archived ? "Volver a activar" : "Archivar categoría"}
            </Button>
          ) : null}
        </div>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <Field id="categoria-nombre" label="Nombre">
          <Input
            id="categoria-nombre"
            value={name}
            maxLength={30}
            autoComplete="off"
            placeholder="Ej. Mascotas"
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
          />
        </Field>
        {!hasChildren ? (
          <Field
            id="categoria-madre"
            label="Es subcategoría de"
            hint="Las subcategorías cuentan dentro de su categoría en presupuestos y resúmenes."
          >
            <Select
              id="categoria-madre"
              value={parentId ?? ""}
              aria-describedby="categoria-madre-ayuda"
              onChange={(event) => setParentId(event.target.value || null)}
            >
              <option value="">Ninguna (categoría principal)</option>
              {parents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        {type === "gasto" && !parentId ? (
          <Field id="categoria-grupo" label="Grupo en la plantilla 50/30/20">
            <Select
              id="categoria-grupo"
              value={group ?? ""}
              onChange={(event) => setGroup((event.target.value || null) as Category["group"])}
            >
              <option value="">Sin grupo</option>
              {BUDGET_GROUPS.map((option) => (
                <option key={option} value={option}>
                  {GROUP_LABELS[option]}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-etiqueta font-medium text-texto-2">Ícono</legend>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
            {Object.entries(CATEGORY_ICONS).map(([key, { label }]) => (
              <button
                key={key}
                type="button"
                aria-label={label}
                aria-pressed={icon === key}
                onClick={() => setIcon(key)}
                className={cn(
                  "grid size-11 place-items-center rounded-control border transition-colors duration-120 ease-boveda",
                  icon === key ? "border-laton text-laton" : "border-borde text-texto-2 hover:text-texto",
                )}
              >
                <CategoryIcon name={key} />
              </button>
            ))}
          </div>
        </fieldset>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
