"use client";

import { useState, useMemo, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { ServiceVisual } from "@/components/ServiceVisual";
import {
  ServiceIconComponent,
  SERVICE_ICON_OPTIONS,
  ICON_GROUPS,
} from "@/utils/serviceIcon";
import { AdminCategoryFormState } from "./actions";

/* ------------------------------------------------------------------ */
/*  Shared types                                                       */
/* ------------------------------------------------------------------ */

export interface SubcategoryNode {
  id: string;
  subcategory_name: string;
  icon_name?: string | null;
  image_url?: string | null;
  category_id?: string | null;
}

export interface CategoryNode {
  id: string;
  category_name: string;
  image_url?: string | null;
  subcategories: SubcategoryNode[];
}

export interface ServiceNode {
  id: string;
  title: string;
  subcategory_id?: string | null;
}

interface Props {
  initialCategories: CategoryNode[];
  initialServices: ServiceNode[];
  createCategoryAction: (p: AdminCategoryFormState, fd: FormData) => Promise<AdminCategoryFormState>;
  updateCategoryAction: (p: AdminCategoryFormState, fd: FormData) => Promise<AdminCategoryFormState>;
  deleteCategoryAction: (p: AdminCategoryFormState, fd: FormData) => Promise<AdminCategoryFormState>;
  createSubcategoryAction: (p: AdminCategoryFormState, fd: FormData) => Promise<AdminCategoryFormState>;
  updateSubcategoryAction: (p: AdminCategoryFormState, fd: FormData) => Promise<AdminCategoryFormState>;
  deleteSubcategoryAction: (p: AdminCategoryFormState, fd: FormData) => Promise<AdminCategoryFormState>;
  assignServicesAction: (p: AdminCategoryFormState, fd: FormData) => Promise<AdminCategoryFormState>;
}

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

type Modal =
  | { kind: "add-category" }
  | { kind: "edit-category"; category: CategoryNode }
  | { kind: "add-subcategories"; categoryId: string }
  | { kind: "edit-subcategory"; sub: SubcategoryNode }
  | { kind: "assign-services"; categoryId: string }
  | { kind: "confirm-delete"; target: "category" | "subcategory"; id: string; title: string }
  | null;

/* ------------------------------------------------------------------ */
/*  Client                                                             */
/* ------------------------------------------------------------------ */

export function CategoryAdminClient({
  initialCategories: categories,
  initialServices: services,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  createSubcategoryAction,
  updateSubcategoryAction,
  deleteSubcategoryAction,
  assignServicesAction,
}: Props) {
  const router = useRouter();
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const counts = useMemo(
    () => ({
      categories: categories.length,
      subcategories: categories.reduce((acc, c) => acc + (c.subcategories?.length ?? 0), 0),
      services: services.length,
    }),
    [categories, services]
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  /* -- helpers ------------------------------------------------------ */

  function runAction(
    fn: (p: AdminCategoryFormState, fd: FormData) => Promise<AdminCategoryFormState>,
    formData: FormData
  ) {
    startTransition(async () => {
      const res = await fn({ type: null, message: null }, formData);
      if (res.type === "error") {
        setToast(res.message ?? "Something went wrong");
        return;
      }
      setToast("Saved successfully");
      setModal(null);
      router.refresh();
    });
  }

  function toastDelete(target: "category" | "subcategory", title: string) {
    setToast(`Deleted ${target} "${title}"`);
  }

  const serviceCountBySubId = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of services) {
      const subId = s.subcategory_id;
      if (!subId) continue;
      map.set(subId, (map.get(subId) ?? 0) + 1);
    }
    return map;
  }, [services]);

  const q = query.trim().toLowerCase();

  const subcategoryIndex = useMemo(() => {
    const list: { sub: SubcategoryNode; parent: CategoryNode }[] = [];
    for (const c of categories) {
      for (const s of c.subcategories ?? []) list.push({ sub: s, parent: c });
    }
    return list;
  }, [categories]);

  const subIdToCategoryId = useMemo(() => {
    const m = new Map<string, string>();
    for (const { sub, parent } of subcategoryIndex) m.set(sub.id, parent.id);
    return m;
  }, [subcategoryIndex]);

  const subIdToName = useMemo(() => {
    const m = new Map<string, string>();
    for (const { sub } of subcategoryIndex) m.set(sub.id, sub.subcategory_name);
    return m;
  }, [subcategoryIndex]);

  const categoryMatches = useMemo(
    () => (q ? categories.filter((c) => c.category_name.toLowerCase().includes(q)) : []),
    [categories, q]
  );
  const subcategoryMatches = useMemo(
    () => (q ? subcategoryIndex.filter(({ sub }) => sub.subcategory_name.toLowerCase().includes(q)) : []),
    [subcategoryIndex, q]
  );
  const serviceMatches = useMemo(
    () => (q ? services.filter((s) => s.title.toLowerCase().includes(q)) : []),
    [services, q]
  );

  const visibleCategories = useMemo(
    () => (filterCategoryId ? categories.filter((c) => c.id === filterCategoryId) : categories),
    [categories, filterCategoryId]
  );

  function selectCategory(id: string) {
    setFilterCategoryId(id);
    setSearchOpen(false);
  }

  /* -- render ------------------------------------------------------ */

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-100 animate-in fade-in slide-in-from-top-4">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-xl px-6 py-4 text-xs font-bold text-primary flex items-center gap-3 max-w-sm">
            <span className="material-symbols-outlined text-emerald-600 text-sm">check_circle</span>
            {toast}
          </div>
        </div>
      )}

      {/* Stats row + quick actions */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-stretch">
        <div className="grid grid-cols-3 gap-3 flex-1">
          {[
            { label: "Categories", value: counts.categories, icon: "category" },
            { label: "Sub-categories", value: counts.subcategories, icon: "subdirectory_arrow_right" },
            { label: "Services", value: counts.services, icon: "handyman" },
          ].map((s) => (
            <Card key={s.label} variant="solid" className="p-4 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-lg">{s.icon}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant truncate">{s.label}</p>
                <p className="text-lg font-headline font-black text-primary mt-0.5 leading-none">{s.value}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex lg:flex-col gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setModal({ kind: "add-category" })}
            className="w-full lg:w-auto px-5 py-3 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">add</span> Add Category
          </button>

          <div className="relative w-full lg:w-72">
            <span className="material-symbols-outlined text-base text-on-surface-variant/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value.trim()) setSearchOpen(true);
              }}
              onFocus={() => {
                if (blurTimer.current) clearTimeout(blurTimer.current);
                setSearchOpen(true);
              }}
              onBlur={() => {
                if (blurTimer.current) clearTimeout(blurTimer.current);
                blurTimer.current = setTimeout(() => setSearchOpen(false), 200);
              }}
              placeholder="Search categories, sub-categories, services…"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-outline-variant/20 bg-surface-container-lowest text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/50"
            />
            {query && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuery("");
                  setFilterCategoryId(null);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}

            {searchOpen && q && (
              <div className="absolute right-0 top-full mt-2 w-full lg:w-96 max-h-96 overflow-y-auto bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-top-2">
                {categoryMatches.length === 0 && subcategoryMatches.length === 0 && serviceMatches.length === 0 && (
                  <p className="px-3 py-4 text-xs text-on-surface-variant/60 font-medium italic text-center">
                    No matches for “{query.trim()}”
                  </p>
                )}

                {categoryMatches.length > 0 && (
                  <div className="mb-1">
                    <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Categories ({categoryMatches.length})
                    </p>
                    {categoryMatches.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectCategory(c.id)}
                        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-surface-dim text-left transition-colors cursor-pointer"
                      >
                        <ServiceVisual
                          imageUrl={c.image_url ?? null}
                          iconName="category"
                          alt={c.category_name}
                          containerClassName="w-9 h-9 rounded-lg shrink-0"
                          iconClassName="w-4 h-4 text-emerald-600"
                          thumbnailSize={64}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-primary truncate">{c.category_name}</p>
                          <p className="text-[10px] text-on-surface-variant">Category</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {subcategoryMatches.length > 0 && (
                  <div className="mb-1">
                    <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Sub-categories ({subcategoryMatches.length})
                    </p>
                    {subcategoryMatches.map(({ sub, parent }) => (
                      <button
                        key={sub.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectCategory(parent.id)}
                        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-surface-dim text-left transition-colors cursor-pointer"
                      >
                        <ServiceVisual
                          imageUrl={sub.image_url ?? null}
                          iconName={sub.icon_name ?? "category"}
                          alt={sub.subcategory_name}
                          containerClassName="w-9 h-9 rounded-lg shrink-0"
                          iconClassName="w-4 h-4 text-emerald-600"
                          thumbnailSize={64}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-primary truncate">{sub.subcategory_name}</p>
                          <p className="text-[10px] text-on-surface-variant truncate">in {parent.category_name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {serviceMatches.length > 0 && (
                  <div>
                    <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Services ({serviceMatches.length})
                    </p>
                    {serviceMatches.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                        const ownerId = s.subcategory_id ? subIdToCategoryId.get(s.subcategory_id) : undefined;
                        if (ownerId) selectCategory(ownerId);
                        else setSearchOpen(false);
                      }}
                        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-surface-dim text-left transition-colors cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-emerald-600 text-base">handyman</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-primary truncate">{s.title}</p>
                          <p className="text-[10px] text-on-surface-variant truncate">
                            {subIdToName.get(s.subcategory_id ?? "") ?? "Unassigned"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Categories list */}
      <div className="space-y-3">
        {filterCategoryId && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Showing:</span>
            <span className="text-xs font-black text-primary bg-secondary/10 px-2.5 py-1 rounded-full flex items-center gap-2">
              {categories.find((c) => c.id === filterCategoryId)?.category_name ?? "Filtered"}
              <button
                type="button"
                onClick={() => setFilterCategoryId(null)}
                className="w-4 h-4 flex items-center justify-center rounded-full bg-secondary text-white hover:scale-110 transition-transform cursor-pointer"
                aria-label="Clear filter"
              >
                <span className="material-symbols-outlined text-[10px]">close</span>
              </button>
            </span>
          </div>
        )}

        {visibleCategories.map((cat) => (
          <div key={cat.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 overflow-hidden">
            {/* Category header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-outline-variant/10">
              <ServiceVisual
                imageUrl={cat.image_url ?? null}
                iconName="category"
                alt={cat.category_name}
                containerClassName="w-11 h-11 rounded-xl shrink-0"
                iconClassName="w-5 h-5 text-emerald-600"
                thumbnailSize={96}
              />
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-headline font-black text-primary truncate">{cat.category_name}</h2>
                <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                  {cat.subcategories.length} sub-categor{cat.subcategories.length === 1 ? "y" : "ies"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                <Button
                  variant="ghost"
                  onClick={() => setModal({ kind: "edit-category", category: cat })}
                  className="px-3! py-1.5! text-[10px]! gap-1! rounded-lg!"
                >
                  <span className="material-symbols-outlined text-sm">edit</span> Edit
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setModal({ kind: "add-subcategories", categoryId: cat.id })}
                  className="px-3! py-1.5! text-[10px]! gap-1! rounded-lg! text-secondary!"
                >
                  <span className="material-symbols-outlined text-sm">add</span> Sub-cat
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setModal({ kind: "assign-services", categoryId: cat.id })}
                  className="px-3! py-1.5! text-[10px]! gap-1! rounded-lg!"
                >
                  <span className="material-symbols-outlined text-sm">swap_horiz</span> Assign Sub-Category
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setModal({ kind: "confirm-delete", target: "category", id: cat.id, title: cat.category_name })}
                  className="px-2.5! py-1.5! text-[10px]! gap-1! rounded-lg! text-red-600! hover:bg-red-500/10!w"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </Button>
              </div>
            </div>

            {/* Subcategory rows */}
            <div className="divide-y divide-outline-variant/10">
              {cat.subcategories.length === 0 && (
                <p className="px-4 py-4 text-xs text-on-surface-variant/60 font-medium italic">
                  No sub-categories yet.
                </p>
              )}
              {cat.subcategories.map((sub) => (
                <div key={sub.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-dim/50 transition-colors">
                  <ServiceVisual
                    imageUrl={sub.image_url ?? null}
                    iconName={sub.icon_name ?? "category"}
                    alt={sub.subcategory_name}
                    containerClassName="w-9 h-9 rounded-lg shrink-0"
                    iconClassName="w-4 h-4 text-emerald-600"
                    thumbnailSize={72}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-primary truncate">{sub.subcategory_name}</p>
                  </div>
                  <Badge variant="surface" className="text-[9px]! px-2! py-0.5! shrink-0">
                    {serviceCountBySubId.get(sub.id) ?? 0} service{(serviceCountBySubId.get(sub.id) ?? 0) !== 1 ? "s" : ""}
                  </Badge>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      title="Edit"
                      onClick={() => setModal({ kind: "edit-subcategory", sub })}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      onClick={() => setModal({ kind: "confirm-delete", target: "subcategory", id: sub.id, title: sub.subcategory_name })}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-red-600/70 hover:bg-red-500/10 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <Card variant="solid" className="p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 block mb-2">category</span>
            <p className="text-on-surface-variant font-bold text-sm">No categories created yet.</p>
            <Button variant="ghost" onClick={() => setModal({ kind: "add-category" })} className="mt-4! text-secondary! gap-1.5!">
              <span className="material-symbols-outlined text-sm">add</span> Add your first category
            </Button>
          </Card>
        )}
      </div>

      {/* Modals */}
      {modal?.kind === "add-category" && (
        <AddCategoryModal onClose={() => setModal(null)} onSubmit={(fd) => runAction(createCategoryAction, fd)} />
      )}
      {modal?.kind === "edit-category" && (
        <EditCategoryModal
          category={modal.category}
          onClose={() => setModal(null)}
          onSubmit={(fd) => runAction(updateCategoryAction, fd)}
        />
      )}
      {modal?.kind === "add-subcategories" && (
        <AddSubcategoryModal
          categories={categories}
          defaultCategoryId={modal.categoryId}
          onClose={() => setModal(null)}
          onSubmit={(fd) => runAction(createSubcategoryAction, fd)}
        />
      )}
      {modal?.kind === "edit-subcategory" && (
        <EditSubcategoryModal
          sub={modal.sub}
          categories={categories}
          onClose={() => setModal(null)}
          onSubmit={(fd) => runAction(updateSubcategoryAction, fd)}
        />
      )}
      {modal?.kind === "assign-services" && (
        <AssignServicesModal
          category={categories.find((c) => c.id === modal.categoryId)!}
          allServices={services}
          onClose={() => setModal(null)}
          onSubmit={(fd) => runAction(assignServicesAction, fd)}
          isSubmitting={isSubmitting}
        />
      )}
      {modal?.kind === "confirm-delete" && (
        <ConfirmDeleteModal
          target={modal.target}
          title={modal.title}
          onClose={() => setModal(null)}
          onConfirm={() => {
            const fn = modal.target === "category" ? deleteCategoryAction : deleteSubcategoryAction;
            const fd = new FormData();
            fd.append(modal.target === "category" ? "category_id" : "subcategory_id", modal.id);
            startTransition(async () => {
              const res = await fn({ type: null, message: null }, fd);
              if (res.type === "error") { setToast(res.message ?? "Delete failed"); return; }
              toastDelete(modal.target, modal.title);
              setModal(null);
              router.refresh();
            });
          }}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Modals                                                             */
/* ------------------------------------------------------------------ */

/* -- Overlays shared wrapper --------------------------------------- */

function ModalWrapper({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm animate-in fade-in" role="dialog">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close" />
      <div className="relative z-10 w-full max-w-lg bg-surface-container-lowest rounded-[28px] border border-outline-variant/20 shadow-2xl p-6 animate-in slide-in-from-bottom-4 max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

/* -- Add category -------------------------------------------------- */

function AddCategoryModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  const [name, setName] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <ModalWrapper onClose={onClose}>
      <h3 className="text-primary font-bold text-base mb-4">New Category</h3>
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(formRef.current!);
          onSubmit(fd);
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Category Name</label>
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold text-primary"
            placeholder="e.g. Cleaning &amp; Housekeeping"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Category Image</label>
          <ImageUploadField
            title="Category Image"
            description="Square tile shown on the landing page. Cropped to a fixed 512×512 WebP on upload."
            aspect={1}
            aspectLabel="1:1"
            outputWidth={512}
            outputHeight={512}
            fileNameSuffix="cat-img"
          />
          <p className="text-[10px] text-on-surface-variant/70 mt-1.5">
            Optional. If set, the icon is used as fallback only.
          </p>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={!name.trim()}>Create Category</Button>
        </div>
      </form>
    </ModalWrapper>
  );
}

/* -- Edit category ------------------------------------------------- */

function EditCategoryModal({
  category,
  onClose,
  onSubmit,
}: {
  category: CategoryNode;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  const [name, setName] = useState(category.category_name);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <ModalWrapper onClose={onClose}>
      <h3 className="text-primary font-bold text-base mb-4">Edit Category</h3>
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(formRef.current!);
          fd.append("category_id", category.id);
          onSubmit(fd);
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Category Name</label>
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold text-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Category Image</label>
          <ImageUploadField
            defaultValue={category.image_url ?? ""}
            title="Category Image"
            description="Square tile shown on the landing page. Cropped to a fixed 512×512 WebP on upload."
            aspect={1}
            aspectLabel="1:1"
            outputWidth={512}
            outputHeight={512}
            fileNameSuffix="cat-img"
          />
          <p className="text-[10px] text-on-surface-variant/70 mt-1.5">
            Optional. If set, the icon is used as fallback only.
          </p>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={!name.trim()}>Save Changes</Button>
        </div>
      </form>
    </ModalWrapper>
  );
}

/* -- Add subcategories (bulk) -------------------------------------- */

function AddSubcategoryModal({
  categories,
  defaultCategoryId,
  onClose,
  onSubmit,
}: {
  categories: CategoryNode[];
  defaultCategoryId: string;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [namesRaw, setNamesRaw] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("sparkles");
  const [activeGroup, setActiveGroup] = useState(ICON_GROUPS[0]);
  const filteredIcons = useMemo(() => SERVICE_ICON_OPTIONS.filter((o) => o.group === activeGroup), [activeGroup]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const names = namesRaw.split("\n").map((s) => s.trim()).filter(Boolean);
    if (names.length === 0 || !categoryId) return;
    const fd = new FormData(e.currentTarget);
    fd.append("names_json", JSON.stringify(names));
    fd.append("icon_name", selectedIcon);
    onSubmit(fd);
  }

  return (
    <ModalWrapper onClose={onClose}>
      <h3 className="text-primary font-bold text-base mb-1">Add Sub-categories</h3>
      <p className="text-xs text-on-surface-variant/70 font-medium mb-4">Type one name per line. All share the same icon and image.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Parent Category</label>
          <select
            name="category_id"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold text-primary"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.category_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Sub-category Names</label>
          <textarea
            required
            rows={5}
            value={namesRaw}
            onChange={(e) => setNamesRaw(e.target.value)}
            className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface focus:ring-2 focus:ring-primary/20 outline-none text-xs font-mono text-primary resize-none"
            placeholder={"Sofa Cleaning\nCarpet Washing\nBath Cleaning"}
          />
          <p className="text-[10px] text-on-surface-variant/60 mt-1">{namesRaw.split("\n").filter((l) => l.trim()).length} sub-categor{(namesRaw.split("\n").filter((l) => l.trim()).length) !== 1 ? "ies" : "y"} will be created</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Icon (shared fallback)</label>
          <div className="flex items-center gap-3 mb-2 p-3 bg-surface rounded-xl border border-outline-variant/15">
            <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
              <ServiceIconComponent iconName={selectedIcon} className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-xs font-bold text-primary">{SERVICE_ICON_OPTIONS.find((o) => o.name === selectedIcon)?.label ?? selectedIcon}</span>
          </div>
          <div className="flex gap-1.5 flex-wrap mb-2">
            {ICON_GROUPS.map((g) => (
              <button key={g} type="button" onClick={() => setActiveGroup(g)} className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${activeGroup === g ? "bg-primary text-white" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}>{g}</button>
            ))}
          </div>
          <div className="grid grid-cols-8 gap-1.5 p-3 bg-surface rounded-xl border border-outline-variant/15 max-h-36 overflow-y-auto">
            {filteredIcons.map((opt) => (
              <button key={opt.name} type="button" title={opt.label} onClick={() => setSelectedIcon(opt.name)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${selectedIcon === opt.name ? "bg-green-500/20 ring-2 ring-emerald-500 scale-110" : "bg-surface-container-lowest hover:bg-green-500/10 hover:scale-105"}`}>
                <ServiceIconComponent iconName={opt.name} className="w-3.5 h-3.5 text-emerald-600" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Shared Image (optional)</label>
          <ImageUploadField
            title="Sub-category Image"
            description="Square tile shown in grids. Cropped to a fixed 512×512 WebP on upload."
            aspect={1}
            aspectLabel="1:1"
            outputWidth={512}
            outputHeight={512}
            fileNameSuffix="subcat-img"
          />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={!namesRaw.trim() || !categoryId}>
            Create {(namesRaw.split("\n").filter((l) => l.trim()).length) || 0} sub-categor{(namesRaw.split("\n").filter((l) => l.trim()).length) !== 1 ? "ies" : "y"}
          </Button>
        </div>
      </form>
    </ModalWrapper>
  );
}

/* -- Edit subcategory ---------------------------------------------- */

function EditSubcategoryModal({
  sub,
  categories,
  onClose,
  onSubmit,
}: {
  sub: SubcategoryNode;
  categories: CategoryNode[];
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  const [name, setName] = useState(sub.subcategory_name);
  const [icon, setIcon] = useState(sub.icon_name ?? "sparkles");
  const [categoryId, setCategoryId] = useState(sub.category_id ?? "");
  const [activeGroup, setActiveGroup] = useState(ICON_GROUPS[0]);
  const filteredIcons = useMemo(() => SERVICE_ICON_OPTIONS.filter((o) => o.group === activeGroup), [activeGroup]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !icon) return;
    const fd = new FormData(e.currentTarget);
    fd.append("subcategory_id", sub.id);
    fd.append("name", name.trim());
    fd.append("icon_name", icon);
    onSubmit(fd);
  }

  return (
    <ModalWrapper onClose={onClose}>
      <h3 className="text-primary font-bold text-base mb-4">Edit Sub-category</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Parent Category</label>
          <select
            name="category_id"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold text-primary"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.category_name}</option>
            ))}
          </select>
          <p className="text-[10px] text-on-surface-variant/60 mt-1">Moving a sub-category does not remap its services automatically; use Assign Services instead.</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Sub-category Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold text-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Icon</label>
          <div className="flex items-center gap-3 mb-2 p-3 bg-surface rounded-xl border border-outline-variant/15">
            <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
              <ServiceIconComponent iconName={icon} className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-xs font-bold text-primary">{SERVICE_ICON_OPTIONS.find((o) => o.name === icon)?.label ?? icon}</span>
          </div>
          <div className="flex gap-1.5 flex-wrap mb-2">
            {ICON_GROUPS.map((g) => (
              <button key={g} type="button" onClick={() => setActiveGroup(g)} className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${activeGroup === g ? "bg-primary text-white" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}>{g}</button>
            ))}
          </div>
          <div className="grid grid-cols-8 gap-1.5 p-3 bg-surface rounded-xl border border-outline-variant/15 max-h-36 overflow-y-auto">
            {filteredIcons.map((opt) => (
              <button key={opt.name} type="button" title={opt.label} onClick={() => setIcon(opt.name)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${icon === opt.name ? "bg-green-500/20 ring-2 ring-emerald-500 scale-110" : "bg-surface-container-lowest hover:bg-green-500/10 hover:scale-105"}`}>
                <ServiceIconComponent iconName={opt.name} className="w-3.5 h-3.5 text-emerald-600" />
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Sub-category Image</label>
          <ImageUploadField
            defaultValue={sub.image_url ?? ""}
            title="Sub-category Image"
            description="Square tile shown in grids. Cropped to a fixed 512×512 WebP on upload."
            aspect={1}
            aspectLabel="1:1"
            outputWidth={512}
            outputHeight={512}
            fileNameSuffix="subcat-img"
          />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={!name.trim() || !icon}>Save Changes</Button>
        </div>
      </form>
    </ModalWrapper>
  );
}

/* -- Assign services ----------------------------------------------- */

function AssignServicesModal({
  category,
  allServices,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  category: CategoryNode;
  allServices: ServiceNode[];
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
  isSubmitting: boolean;
}) {
  const subIds = useMemo(() => new Set(category.subcategories.map((s) => s.id)), [category.subcategories]);
  const inCategoryServices = useMemo(() => allServices.filter((s) => s.subcategory_id && subIds.has(s.subcategory_id)), [allServices, subIds]);
  const unassignedServices = useMemo(() => allServices.filter((s) => !s.subcategory_id), [allServices]);
  const otherServices = useMemo(() => allServices.filter((s) => s.subcategory_id && !subIds.has(s.subcategory_id)), [allServices, subIds]);

  const [targetSubId, setTargetSubId] = useState(category.subcategories[0]?.id ?? "");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState<"unassigned" | "this-category" | "other">("unassigned");

  const displayServices = useMemo(() => {
    const pool = tab === "unassigned" ? unassignedServices : tab === "this-category" ? inCategoryServices : otherServices;
    const q = filter.toLowerCase();
    return pool.filter((s) => !q || s.title.toLowerCase().includes(q));
  }, [tab, filter, unassignedServices, inCategoryServices, otherServices]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((prev) => {
      const visibleIds = displayServices.map((s) => s.id);
      if (visibleIds.every((id) => prev.has(id))) {
        return new Set(prev.size === displayServices.length ? [] : [...prev].filter((id) => !visibleIds.includes(id)));
      }
      return new Set([...prev, ...visibleIds]);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetSubId || selectedIds.size === 0) return;
    const fd = new FormData();
    fd.append("category_id", category.id);
    fd.append("subcategory_id", targetSubId);
    fd.append("service_ids_json", JSON.stringify([...selectedIds]));
    onSubmit(fd);
  }

  const selectedCount = selectedIds.size;
  const tabs = [
    { key: "unassigned", label: "Unassigned", count: unassignedServices.length },
    { key: "this-category", label: "In this category", count: inCategoryServices.length },
    { key: "other", label: "Other categories", count: otherServices.length },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm animate-in fade-in" role="dialog">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close" />
      <div className="relative z-10 w-full max-w-2xl bg-surface-container-lowest rounded-[28px] border border-outline-variant/20 shadow-2xl p-6 animate-in slide-in-from-bottom-4 max-h-[90vh] flex flex-col">
        <h3 className="text-primary font-bold text-base mb-1">Assign Services</h3>
        <p className="text-xs text-on-surface-variant/70 font-medium mb-4">{category.category_name}</p>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Target subcategory */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Target Sub-category</label>
            <select
              value={targetSubId}
              onChange={(e) => setTargetSubId(e.target.value)}
              className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold text-primary"
            >
              {category.subcategories.length === 0 && <option disabled>No sub-categories in this category</option>}
              {category.subcategories.map((s) => (
                <option key={s.id} value={s.id}>{s.subcategory_name}</option>
              ))}
            </select>
          </div>

          {/* Tabs + filter */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex gap-1 bg-surface rounded-xl p-1 flex-1">
              {tabs.map((t) => (
                <button key={t.key} type="button" onClick={() => { setTab(t.key); setFilter(""); }} className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg transition-all ${tab === t.key ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container-high"}`}>
                  {t.label} ({t.count})
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Search…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-40 border border-outline-variant/20 rounded-lg px-3 py-1.5 bg-surface text-xs text-primary outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Service list */}
          <div className="border border-outline-variant/15 rounded-2xl overflow-hidden bg-surface flex-1 min-h-0 overflow-y-auto">
            {/* Select all */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-outline-variant/10 bg-surface-container-dim sticky top-0 z-10">
              <input
                type="checkbox"
                checked={displayServices.length > 0 && displayServices.every((s) => selectedIds.has(s.id))}
                onChange={toggleAll}
                className="w-4 h-4 accent-secondary rounded"
              />
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                {displayServices.length} service{displayServices.length !== 1 ? "s" : ""} · {selectedCount} selected
              </span>
            </div>
            {displayServices.length === 0 && (
              <p className="px-4 py-6 text-xs text-on-surface-variant/50 font-medium italic text-center">No services here.</p>
            )}
            {displayServices.map((s) => {
              const currentSubName = category.subcategories.find((c) => c.id === s.subcategory_id)?.subcategory_name
                ?? (s.subcategory_id ? "Other" : "Unassigned");
              return (
                <label key={s.id} className={`flex items-center gap-3 px-4 py-2.5 hover:bg-surface-dim/50 transition-colors cursor-pointer ${selectedIds.has(s.id) ? "bg-secondary/5" : ""}`}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(s.id)}
                    onChange={() => toggle(s.id)}
                    className="w-4 h-4 accent-secondary rounded shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-primary truncate">{s.title}</p>
                    <p className="text-[10px] text-on-surface-variant truncate mt-0.5">Currently: {currentSubName}</p>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={isSubmitting || !targetSubId || selectedCount === 0}>
              {isSubmitting ? "Saving…" : `Assign ${selectedCount} service${selectedCount !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -- Confirm delete ------------------------------------------------ */

function ConfirmDeleteModal({
  target,
  title,
  onClose,
  onConfirm,
}: {
  target: "category" | "subcategory";
  title: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm animate-in fade-in" role="dialog">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close" />
      <div className="relative z-10 w-full max-w-sm bg-surface-container-lowest rounded-[28px] border border-outline-variant/20 shadow-2xl p-6 animate-in slide-in-from-bottom-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-red-600 text-2xl">warning</span>
        </div>
        <h3 className="text-primary font-bold text-base mb-2">Delete {target === "category" ? "Category" : "Sub-category"}</h3>
        <p className="text-xs text-on-surface-variant mb-6">
          Are you sure you want to delete <span className="font-bold text-primary">{title}</span>? This action cannot be undone.
        </p>
        <div className="flex gap-2 justify-center">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onConfirm} className="bg-error! hover:bg-error/90!">Delete</Button>
        </div>
      </div>
    </div>
  );
}