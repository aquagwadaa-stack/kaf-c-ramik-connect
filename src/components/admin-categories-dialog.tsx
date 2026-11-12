import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowDown, ArrowUp, Check, Filter, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { CategoryChip } from "@/components/category-chip";
import type { CeramicObject } from "@/lib/admin-data";
import {
  CATEGORY_COLORS,
  CATEGORY_COLOR_KEYS,
  CATEGORY_DECORATIONS,
  CATEGORY_LABEL_MAX,
  countCategoryObjects,
  createCategoryId,
  moveCategory,
  removeCategory,
  sameCategories,
  validateCategoryLabel,
  type CategoryColorKey,
  type CategoryDecoration,
  type ObjectCategory,
} from "@/lib/object-categories";

export type CategoriesDialogResult = {
  /** Liste complète, dans l'ordre d'affichage. */
  categories: ObjectCategory[];
  /** Objets après les déplacements liés aux suppressions ; `null` s'ils n'ont pas changé. */
  objects: CeramicObject[] | null;
  /** Identifiants des catégories créées pendant cette session. */
  createdIds: string[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ObjectCategory[];
  objects: CeramicObject[];
  /** Ouvre directement sur le formulaire d'une nouvelle catégorie. */
  startWithNew?: boolean;
  /** Enregistre tout. Renvoie `false` en cas d'échec : la fenêtre reste alors ouverte. */
  onSave: (result: CategoriesDialogResult) => Promise<boolean>;
};

const TEMP_PREFIX = "kafe-new-";
const isTempId = (id: string) => id.startsWith(TEMP_PREFIX);
const cleanLabel = (label: string) => label.trim().replace(/\s+/g, " ");

/** Suit la chaîne des déplacements : A supprimée vers B, puis B supprimée vers C → A va dans C. */
function resolveMove(id: string, moves: Record<string, string>) {
  let current = id;
  const seen = new Set<string>();
  while (moves[current] && !seen.has(current)) {
    seen.add(current);
    current = moves[current];
  }
  return current;
}

function countLabel(total: number, visible: number) {
  if (total === 0) return "Aucun objet";
  return `${total} objet${total > 1 ? "s" : ""} · ${visible} visible${visible > 1 ? "s" : ""}`;
}

/** Flèches du clavier dans un groupe radio : déplace la sélection et le focus. */
function handleRadioKeys<T extends string>(
  event: KeyboardEvent<HTMLDivElement>,
  keys: readonly T[],
  current: T,
  onChange: (next: T) => void,
) {
  const step =
    event.key === "ArrowRight" || event.key === "ArrowDown"
      ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowUp"
        ? -1
        : 0;
  if (step === 0) return;
  event.preventDefault();
  const index = keys.indexOf(current);
  const next = keys[(index + step + keys.length) % keys.length];
  onChange(next);
  const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]');
  buttons[keys.indexOf(next)]?.focus();
}

export function CategoriesDialog(props: Props) {
  // Le contenu est monté à chaque ouverture : le brouillon repart toujours de l'état enregistré.
  if (!props.open) return null;
  return <CategoriesDialogInner {...props} />;
}

function CategoriesDialogInner({
  onOpenChange,
  categories,
  objects,
  startWithNew = false,
  onSave,
}: Props) {
  const tempCounter = useRef(0);
  const nextTempId = () => `${TEMP_PREFIX}${++tempCounter.current}`;
  const blankCategory = (): ObjectCategory => ({
    id: nextTempId(),
    label: "",
    color: "creme",
    decoration: "none",
    visible: true,
  });

  const [initialNew] = useState(() => (startWithNew ? blankCategory() : null));
  const [draft, setDraft] = useState<ObjectCategory[]>(() =>
    initialNew ? [...categories, initialNew] : categories,
  );
  /** Suppressions avec déplacement d'objets : id supprimé → id de destination. */
  const [moves, setMoves] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(initialNew?.id ?? null);
  const [focusNameId, setFocusNameId] = useState<string | null>(null);
  const [previewActiveId, setPreviewActiveId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ObjectCategory | null>(null);
  const [destinationId, setDestinationId] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const nameInputs = useRef(new Map<string, HTMLInputElement>());

  const effectiveObjects = useMemo(
    () =>
      objects.map((item) => {
        const category = resolveMove(item.category, moves);
        return category === item.category ? item : { ...item, category };
      }),
    [objects, moves],
  );

  const errors = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of draft) {
      const error = validateCategoryLabel(category.label, draft, category.id);
      if (error) map.set(category.id, error);
    }
    return map;
  }, [draft]);

  // Une nouvelle ligne encore vide ne compte pas comme une modification.
  const meaningfulDraft = draft.filter(
    (category) => !(isTempId(category.id) && category.label.trim() === ""),
  );
  const dirty = !sameCategories(meaningfulDraft, categories) || Object.keys(moves).length > 0;
  const firstError = draft.map((category) => errors.get(category.id)).find(Boolean);
  const canSave = dirty && errors.size === 0 && !saving;

  useEffect(() => {
    if (!focusNameId) return;
    const input = nameInputs.current.get(focusNameId);
    if (!input) return;
    input.focus();
    input.scrollIntoView({ block: "center" });
    setFocusNameId(null);
  }, [focusNameId, expandedId]);

  function requestClose() {
    if (saving) return;
    if (dirty) setConfirmDiscard(true);
    else onOpenChange(false);
  }

  function patch(id: string, change: Partial<ObjectCategory>) {
    setSaveError("");
    setDraft((list) =>
      list.map((category) => (category.id === id ? { ...category, ...change } : category)),
    );
  }

  function applyDecoration(id: string, decoration: CategoryDecoration) {
    const advised = CATEGORY_DECORATIONS.find((item) => item.key === decoration);
    // Une fête applique sa couleur conseillée ; « Aucun » garde la couleur en place.
    patch(
      id,
      decoration === "none" || !advised ? { decoration } : { decoration, color: advised.color },
    );
  }

  function addCategory() {
    const created = blankCategory();
    setSaveError("");
    setDraft((list) => [...list, created]);
    setExpandedId(created.id);
    setFocusNameId(created.id);
  }

  function askDelete(category: ObjectCategory) {
    const { total } = countCategoryObjects(effectiveObjects, category.id);
    // Une ligne jamais enregistrée et sans objet se retire directement.
    if (isTempId(category.id) && total === 0) {
      setDraft((list) => list.filter((item) => item.id !== category.id));
      if (expandedId === category.id) setExpandedId(null);
      return;
    }
    setDestinationId("");
    setDeleteTarget(category);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const result = removeCategory(draft, effectiveObjects, deleteTarget.id, destinationId);
    if (!result.ok) return;
    setSaveError("");
    setDraft(result.categories);
    if (result.moved > 0) setMoves((current) => ({ ...current, [deleteTarget.id]: destinationId }));
    if (expandedId === deleteTarget.id) setExpandedId(null);
    if (previewActiveId === deleteTarget.id) setPreviewActiveId(null);
    setDeleteTarget(null);
  }

  async function handleSave() {
    if (!canSave) return;
    const taken = new Set([...categories, ...draft].map((category) => category.id));
    const idMap = new Map<string, string>();
    const now = Date.now();
    const finalCategories = draft.map((category) => {
      const label = cleanLabel(category.label);
      if (!isTempId(category.id)) return { ...category, label };
      const id = createCategoryId(label, taken, now);
      taken.add(id);
      idMap.set(category.id, id);
      return { ...category, id, label };
    });
    let objectsChanged = false;
    const finalObjects = objects.map((item) => {
      const resolved = resolveMove(item.category, moves);
      const category = idMap.get(resolved) ?? resolved;
      if (category === item.category) return item;
      objectsChanged = true;
      return { ...item, category };
    });

    setSaving(true);
    setSaveError("");
    let ok = false;
    try {
      ok = await onSave({
        categories: finalCategories,
        objects: objectsChanged ? finalObjects : null,
        createdIds: [...idMap.values()],
      });
    } catch {
      ok = false;
    }
    setSaving(false);
    if (ok) onOpenChange(false);
    else setSaveError("L'enregistrement a échoué. Vérifie la connexion puis réessaie.");
  }

  const previewCategories = draft.filter((category) => category.visible);
  const deleteCount = deleteTarget
    ? countCategoryObjects(effectiveObjects, deleteTarget.id).total
    : 0;
  const destinationChoices = deleteTarget
    ? draft.filter((category) => category.id !== deleteTarget.id)
    : [];
  const destination = destinationChoices.find((category) => category.id === destinationId);
  const displayLabel = (category: ObjectCategory) => cleanLabel(category.label) || "Sans nom";

  return (
    <Dialog open onOpenChange={(next) => (next ? undefined : requestClose())}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          onOpenAutoFocus={(event) => {
            // Ouverture sur « nouvelle catégorie » : le focus va dans le champ Nom.
            const input = initialNew ? nameInputs.current.get(initialNew.id) : undefined;
            if (!input) return;
            event.preventDefault();
            input.focus();
            input.scrollIntoView({ block: "center" });
          }}
          className="kafe-categories-dialog fixed inset-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-foreground shadow-lg outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[85dvh] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-border"
        >
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border pb-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="min-w-0 pt-1">
              <DialogTitle className="font-display text-xl font-normal leading-tight">
                Catégories du catalogue
              </DialogTitle>
              <DialogDescription className="mt-1">
                Nom, couleur, petits dessins, ordre et visibilité des onglets de la page « Objets à
                peindre ».
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={requestClose}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Fermer la fenêtre"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-4 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
            <section aria-labelledby="kafe-categories-preview-title">
              <h3 id="kafe-categories-preview-title" className="text-sm font-semibold">
                Aperçu sur le site
              </h3>
              <div className="mt-2 rounded-xl border-2 border-ink bg-[#ffd6a5] p-3">
                <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-2 pr-1">
                  <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <CategoryChip
                    label="Tous"
                    active={previewActiveId === null}
                    onClick={() => setPreviewActiveId(null)}
                  />
                  {previewCategories.map((category) => {
                    const empty = countCategoryObjects(effectiveObjects, category.id).visible === 0;
                    return (
                      <CategoryChip
                        key={category.id}
                        label={displayLabel(category)}
                        color={category.color}
                        decoration={category.decoration}
                        active={previewActiveId === category.id}
                        onClick={() => setPreviewActiveId(category.id)}
                        className={empty ? "opacity-50" : ""}
                      />
                    );
                  })}
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Touche un onglet pour voir son état sélectionné. Les onglets en transparence sont
                vides : ils n'apparaîtront sur le site qu'avec au moins un objet visible.
              </p>
            </section>

            <section className="mt-6" aria-labelledby="kafe-categories-list-title">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="kafe-categories-list-title" className="text-sm font-semibold">
                  Toutes les catégories ({draft.length})
                </h3>
                <button
                  type="button"
                  onClick={addCategory}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
                >
                  <Plus className="h-4 w-4" /> Nouvelle catégorie
                </button>
              </div>

              <ul className="mt-3 grid gap-3">
                {draft.map((category, index) => {
                  const count = countCategoryObjects(effectiveObjects, category.id);
                  const expanded = expandedId === category.id;
                  const error = errors.get(category.id);
                  const name = displayLabel(category);
                  return (
                    <li
                      key={category.id}
                      className="rounded-2xl border border-border bg-background p-3"
                    >
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <div className="min-w-0 flex-1 basis-44">
                          <div className="no-scrollbar overflow-x-auto pb-1.5 pr-1.5">
                            <CategoryChip
                              preview
                              label={name}
                              color={category.color}
                              decoration={category.decoration}
                            />
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{countLabel(count.total, count.visible)}</span>
                            {!category.visible && (
                              <span className="rounded-full bg-mustard/40 px-2 py-0.5 font-medium text-foreground">
                                Masquée
                              </span>
                            )}
                            {category.visible && count.visible === 0 && (
                              <span className="rounded-full bg-secondary px-2 py-0.5">
                                Vide : n'apparaît pas sur le site
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setDraft((list) => moveCategory(list, category.id, -1))}
                            disabled={index === 0}
                            className="grid h-11 w-11 place-items-center rounded-full border border-border hover:bg-secondary disabled:opacity-30"
                            aria-label={`Monter « ${name} »`}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDraft((list) => moveCategory(list, category.id, 1))}
                            disabled={index === draft.length - 1}
                            className="grid h-11 w-11 place-items-center rounded-full border border-border hover:bg-secondary disabled:opacity-30"
                            aria-label={`Descendre « ${name} »`}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <span
                            className="grid h-11 w-11 place-items-center"
                            title={category.visible ? "Affichée sur le site" : "Masquée"}
                          >
                            <Switch
                              checked={category.visible}
                              onCheckedChange={(visible) => patch(category.id, { visible })}
                              aria-label={`Afficher « ${name} » sur le site`}
                            />
                          </span>
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : category.id)}
                            aria-expanded={expanded}
                            className={`grid h-11 w-11 place-items-center rounded-full border border-border hover:bg-secondary ${expanded ? "bg-secondary" : ""}`}
                            aria-label={`Modifier « ${name} »`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => askDelete(category)}
                            disabled={draft.length <= 1}
                            title={
                              draft.length <= 1
                                ? "Impossible de supprimer la dernière catégorie"
                                : undefined
                            }
                            className="grid h-11 w-11 place-items-center rounded-full border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                            aria-label={`Supprimer « ${name} »`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {error && !expanded && (
                        <p className="mt-2 text-xs font-medium text-destructive">{error}</p>
                      )}

                      {expanded && (
                        <div className="mt-3 grid gap-4 border-t border-border pt-3">
                          <div>
                            <label
                              htmlFor={`kafe-name-${category.id}`}
                              className="mb-1.5 block text-sm font-medium"
                            >
                              Nom
                            </label>
                            <input
                              id={`kafe-name-${category.id}`}
                              ref={(element) => {
                                if (element) nameInputs.current.set(category.id, element);
                                else nameInputs.current.delete(category.id);
                              }}
                              value={category.label}
                              maxLength={CATEGORY_LABEL_MAX}
                              onChange={(event) =>
                                patch(category.id, { label: event.target.value })
                              }
                              aria-invalid={Boolean(error)}
                              aria-describedby={`kafe-name-help-${category.id}`}
                              placeholder="Ex. Noël, Fête des pères…"
                              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-ring sm:text-sm"
                            />
                            <div
                              id={`kafe-name-help-${category.id}`}
                              className="mt-1 flex justify-between gap-3 text-xs"
                            >
                              <span className="font-medium text-destructive" role="alert">
                                {error ?? ""}
                              </span>
                              <span className="shrink-0 text-muted-foreground">
                                {category.label.length}/{CATEGORY_LABEL_MAX}
                              </span>
                            </div>
                          </div>

                          <div>
                            <div
                              id={`kafe-color-${category.id}`}
                              className="mb-1.5 text-sm font-medium"
                            >
                              Couleur de fond
                            </div>
                            <div
                              role="radiogroup"
                              aria-labelledby={`kafe-color-${category.id}`}
                              onKeyDown={(event) =>
                                handleRadioKeys<CategoryColorKey>(
                                  event,
                                  CATEGORY_COLOR_KEYS,
                                  category.color,
                                  (color) => patch(category.id, { color }),
                                )
                              }
                              className="grid grid-cols-4 gap-2 sm:grid-cols-8"
                            >
                              {CATEGORY_COLOR_KEYS.map((key) => {
                                const selected = category.color === key;
                                const color = CATEGORY_COLORS[key];
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    aria-label={color.label}
                                    title={color.label}
                                    tabIndex={selected ? 0 : -1}
                                    onClick={() => patch(category.id, { color: key })}
                                    className={`grid h-11 place-items-center rounded-lg border-2 border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                                    style={{ backgroundColor: color.bg, color: color.text }}
                                  >
                                    {selected && <Check className="h-5 w-5" strokeWidth={3} />}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="mt-1.5 text-xs text-muted-foreground">
                              {CATEGORY_COLORS[category.color].label}
                            </p>
                          </div>

                          <div>
                            <div
                              id={`kafe-decoration-${category.id}`}
                              className="mb-1.5 text-sm font-medium"
                            >
                              Petits dessins
                            </div>
                            <div
                              role="radiogroup"
                              aria-labelledby={`kafe-decoration-${category.id}`}
                              onKeyDown={(event) =>
                                handleRadioKeys<CategoryDecoration>(
                                  event,
                                  CATEGORY_DECORATIONS.map((item) => item.key),
                                  category.decoration,
                                  (decoration) => applyDecoration(category.id, decoration),
                                )
                              }
                              className="flex flex-wrap gap-2"
                            >
                              {CATEGORY_DECORATIONS.map((item) => {
                                const selected = category.decoration === item.key;
                                return (
                                  <button
                                    key={item.key}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    aria-label={item.label}
                                    tabIndex={selected ? 0 : -1}
                                    onClick={() => applyDecoration(category.id, item.key)}
                                    className={`min-h-11 rounded-xl border-2 pb-2.5 pl-2 pr-2.5 pt-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${selected ? "border-primary bg-secondary" : "border-transparent hover:bg-secondary/60"}`}
                                  >
                                    <CategoryChip
                                      preview
                                      label={item.label}
                                      color={item.color}
                                      decoration={item.key}
                                    />
                                  </button>
                                );
                              })}
                            </div>
                            <p className="mt-1.5 text-xs text-muted-foreground">
                              Choisir une fête applique sa couleur conseillée. Tu peux ensuite la
                              changer.
                            </p>
                          </div>

                          <div>
                            <div className="mb-1.5 text-sm font-medium">Aperçu du bouton</div>
                            <div className="flex flex-wrap gap-x-6 gap-y-3 rounded-xl border-2 border-ink bg-[#ffd6a5] p-3">
                              <div>
                                <div className="mb-1.5 text-xs text-foreground/70">Normal</div>
                                <div className="pb-1.5 pr-1.5">
                                  <CategoryChip
                                    preview
                                    label={name}
                                    color={category.color}
                                    decoration={category.decoration}
                                  />
                                </div>
                              </div>
                              <div>
                                <div className="mb-1.5 text-xs text-foreground/70">Sélectionné</div>
                                <div className="pb-1.5 pr-1.5">
                                  <CategoryChip
                                    preview
                                    active
                                    label={name}
                                    color={category.color}
                                    decoration={category.decoration}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <p className="text-xs text-muted-foreground">
                            Masquée : l'onglet et ses objets disparaissent du site. Pratique pour
                            préparer une fête à l'avance.
                          </p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          <footer className="shrink-0 border-t border-border bg-background pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-3">
            {(saveError || (dirty && firstError)) && (
              <p className="mb-2 text-sm font-medium text-destructive" role="alert">
                {saveError || firstError}
              </p>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={requestClose}
                disabled={saving}
                className="min-h-11 rounded-full border border-border px-4 text-sm font-medium hover:bg-secondary disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!canSave}
                className="min-h-11 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </footer>
        </DialogPrimitive.Content>
      </DialogPortal>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(next) => (next ? undefined : setDeleteTarget(null))}
      >
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Supprimer « {deleteTarget ? displayLabel(deleteTarget) : ""} » ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCount > 0
                ? `Cette catégorie contient ${deleteCount} objet${deleteCount > 1 ? "s" : ""}. Choisis la catégorie où ${deleteCount > 1 ? "les" : "le"} ranger.`
                : "Cette catégorie ne contient aucun objet."}{" "}
              La suppression sera effective après « Enregistrer ».
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteCount > 0 && (
            <div>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Catégorie de destination</span>
                <select
                  value={destinationId}
                  onChange={(event) => setDestinationId(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-base sm:text-sm"
                >
                  <option value="" disabled>
                    Choisir une catégorie…
                  </option>
                  {destinationChoices.map((category) => (
                    <option key={category.id} value={category.id}>
                      {displayLabel(category)}
                      {category.visible ? "" : " (masquée)"}
                    </option>
                  ))}
                </select>
              </label>
              {destination && (
                <p className="mt-2 text-sm">
                  {deleteCount} objet{deleteCount > 1 ? "s seront déplacés" : " sera déplacé"} dans
                  « {displayLabel(destination)} ».
                </p>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteCount > 0 && !destination}
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
            >
              {deleteCount > 0 ? "Déplacer et supprimer" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Abandonner les modifications ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les changements non enregistrés sur les catégories seront perdus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuer la modification</AlertDialogCancel>
            <AlertDialogAction onClick={() => onOpenChange(false)}>Abandonner</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
