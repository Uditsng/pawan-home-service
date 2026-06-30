"use client";

import { useState, useActionState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { ServiceIconComponent, SERVICE_ICON_OPTIONS, ICON_GROUPS } from "@/utils/serviceIcon";

// ─── Types ───────────────────────────────────────────────────────────────────

type Subcategory = {
  id: string;
  subcategory_name: string;
  icon_name: string;
};

type Category = {
  id: string;
  category_name: string;
  subcategories: Subcategory[];
};

type FormActionState = {
  type: "success" | "error" | null;
  message: string | null;
};

type AddCategoryResult = { id: string; category_name: string } | { error: string };
type AddSubcategoryResult = { id: string; subcategory_name: string; icon_name: string; category_id: string } | { error: string };

interface CreateServiceFormProps {
  categories: Category[];
  action: (prevState: FormActionState, formData: FormData) => Promise<FormActionState>;
  addCategoryAction: (name: string) => Promise<AddCategoryResult>;
  addSubcategoryAction: (categoryId: string, name: string, iconName: string) => Promise<AddSubcategoryResult>;
}

// ─── Add Category Modal ───────────────────────────────────────────────────────

function AddCategoryModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      await onSave(name.trim());
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-outline-variant/20">
        <h3 className="text-primary font-bold text-base mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-black">+</span>
          New Category
        </h3>
        <div className="mb-4">
          <label className="block text-sm font-bold text-on-surface-variant mb-1.5">Category Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
            placeholder="e.g. Cleaning & Housekeeping"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>
        {error && (
          <p className="text-error text-xs mb-3">{error}</p>
        )}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button type="button" variant="primary" onClick={handleSubmit} disabled={isPending || !name.trim()}>
            {isPending ? "Saving…" : "Save Category"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Subcategory Modal ────────────────────────────────────────────────────

function AddSubcategoryModal({
  categories,
  onClose,
  onSave,
}: {
  categories: Category[];
  onClose: () => void;
  onSave: (categoryId: string, name: string, iconName: string) => Promise<void>;
}) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("sparkles");
  const [activeGroup, setActiveGroup] = useState(ICON_GROUPS[0]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filteredIcons = SERVICE_ICON_OPTIONS.filter((o) => o.group === activeGroup);

  const handleSubmit = () => {
    if (!name.trim() || !categoryId) return;
    setError(null);
    startTransition(async () => {
      await onSave(categoryId, name.trim(), selectedIcon);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-outline-variant/20 max-h-[90vh] overflow-y-auto">
        <h3 className="text-primary font-bold text-base mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-secondary/15 flex items-center justify-center text-secondary text-xs font-black">+</span>
          New Sub-category
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-bold text-on-surface-variant mb-1.5">Parent Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.category_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-on-surface-variant mb-1.5">Sub-category Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
              placeholder="e.g. Cockroach Control"
              autoFocus
            />
          </div>
        </div>

        {/* Icon Picker */}
        <div>
          <label className="block text-sm font-bold text-on-surface-variant mb-2">
            Choose Icon
            <span className="ml-2 text-xs font-normal text-on-surface-variant/60">— picks how it looks on service cards</span>
          </label>

          {/* Selected preview */}
          <div className="flex items-center gap-3 mb-3 p-3 bg-surface-container rounded-xl border border-outline-variant/15">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
              <ServiceIconComponent iconName={selectedIcon} className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface">
                {SERVICE_ICON_OPTIONS.find((o) => o.name === selectedIcon)?.label ?? selectedIcon}
              </p>
              <p className="text-[10px] text-on-surface-variant font-mono">{selectedIcon}</p>
            </div>
          </div>

          {/* Group tabs */}
          <div className="flex gap-1.5 flex-wrap mb-2">
            {ICON_GROUPS.map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => setActiveGroup(group)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${
                  activeGroup === group
                    ? "bg-primary text-white"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {group}
              </button>
            ))}
          </div>

          {/* Icon grid */}
          <div className="grid grid-cols-8 gap-1.5 p-3 bg-surface-container rounded-xl border border-outline-variant/15 max-h-40 overflow-y-auto">
            {filteredIcons.map((opt) => (
              <button
                key={opt.name}
                type="button"
                title={opt.label}
                onClick={() => setSelectedIcon(opt.name)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                  selectedIcon === opt.name
                    ? "bg-green-500/20 ring-2 ring-emerald-500 scale-110"
                    : "bg-surface-container-lowest hover:bg-green-500/10 hover:scale-105"
                }`}
              >
                <ServiceIconComponent iconName={opt.name} className="w-4 h-4 text-emerald-600" />
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-error text-xs mt-3">{error}</p>}

        <div className="flex gap-2 justify-end mt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button type="button" variant="primary" onClick={handleSubmit} disabled={isPending || !name.trim() || !categoryId}>
            {isPending ? "Saving…" : "Save Sub-category"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export function CreateServiceForm({ categories: initialCategories, action, addCategoryAction, addSubcategoryAction }: CreateServiceFormProps) {
  const [state, formAction, isPending] = useActionState(action, { type: null, message: null });

  // Local mutable categories state (so new cat/subcat appear without page reload)
  const [localCategories, setLocalCategories] = useState<Category[]>(initialCategories);
  const [selectedSubcatId, setSelectedSubcatId] = useState<string>("");
  const [selectedIcon, setSelectedIcon] = useState<string>("sparkles");

  // Modal visibility
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddSubcategory, setShowAddSubcategory] = useState(false);

  // Form state
  const [includedItems, setIncludedItems] = useState<string[]>([""]);
  const [excludedItems, setExcludedItems] = useState<string[]>([""]);
  const [faqs, setFaqs] = useState<{ question: string, answer: string }[]>([{ question: "", answer: "" }]);
  const [pricingModel, setPricingModel] = useState<"fixed" | "hourly">("fixed");
  const [durationRates, setDurationRates] = useState<{ duration: number; price: number }[]>([{ duration: 60, price: 199 }]);

  // ── Duration rate helpers ──
  const addDurationRate = () => setDurationRates((prev) => [...prev, { duration: 60, price: 199 }]);
  const removeDurationRate = (i: number) => setDurationRates((prev) => prev.filter((_, idx) => idx !== i));
  const updateDurationRate = (i: number, field: "duration" | "price", value: number) => {
    setDurationRates((prev) => { const c = [...prev]; c[i][field] = value; return c; });
  };

  // ── Subcategory select change ──
  const handleSubcategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subcatId = e.target.value;
    setSelectedSubcatId(subcatId);
    for (const cat of localCategories) {
      const subcat = cat.subcategories.find((s) => s.id === subcatId);
      if (subcat) { setSelectedIcon(subcat.icon_name); return; }
    }
    setSelectedIcon("sparkles");
  };

  // ── List helpers ──
  const updateItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, i: number, val: string) =>
    setter((prev) => { const n = [...prev]; n[i] = val; return n; });
  const addItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => setter((prev) => [...prev, ""]);
  const removeItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, i: number) =>
    setter((prev) => prev.filter((_, idx) => idx !== i));

  // ── FAQ helpers ──
  const updateFaq = (i: number, field: "question" | "answer", val: string) =>
    setFaqs((prev) => { const n = [...prev]; n[i][field] = val; return n; });
  const addFaq = () => setFaqs((prev) => [...prev, { question: "", answer: "" }]);
  const removeFaq = (i: number) => setFaqs((prev) => prev.filter((_, idx) => idx !== i));

  // ── Save new category (called from modal) ──
  const handleSaveCategory = async (name: string) => {
    const result = await addCategoryAction(name);
    if ("error" in result) { alert(result.error); return; }
    setLocalCategories((prev) => [...prev, { id: result.id, category_name: result.category_name, subcategories: [] }]);
    setShowAddCategory(false);
  };

  // ── Save new subcategory (called from modal) ──
  const handleSaveSubcategory = async (categoryId: string, name: string, iconName: string) => {
    const result = await addSubcategoryAction(categoryId, name, iconName);
    if ("error" in result) { alert(result.error); return; }
    setLocalCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? { ...cat, subcategories: [...cat.subcategories, { id: result.id, subcategory_name: result.subcategory_name, icon_name: result.icon_name }] }
          : cat
      )
    );
    // Auto-select the newly created subcategory
    setSelectedSubcatId(result.id);
    setSelectedIcon(result.icon_name);
    setShowAddSubcategory(false);
  };

  return (
    <>
      {showAddCategory && (
        <AddCategoryModal
          onClose={() => setShowAddCategory(false)}
          onSave={handleSaveCategory}
        />
      )}
      {showAddSubcategory && (
        <AddSubcategoryModal
          categories={localCategories}
          onClose={() => setShowAddSubcategory(false)}
          onSave={handleSaveSubcategory}
        />
      )}

      <form action={formAction} className="space-y-6 bg-surface-container-lowest p-5 sm:p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-outline-variant/20">

        {state?.type === "error" && (
          <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg flex items-center gap-3">
            <span className="material-symbols-outlined">error</span>
            <span className="text-sm font-bold">{state.message}</span>
          </div>
        )}

        {/* ── Core Settings ── */}
        <div>
          <h2 className="text-lg font-bold mb-3 border-b border-outline-variant/10 pb-2 text-primary">Core Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-bold text-on-surface-variant mb-2">Service Title</label>
              <input name="title" required type="text" className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="e.g. Deep 3-Seater Sofa Shampooing" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-on-surface-variant mb-2">Select Sub-category</label>
              <div className="flex gap-2">
                {/* Subcategory dropdown */}
                <select
                  name="subcategory_id"
                  required
                  value={selectedSubcatId}
                  onChange={handleSubcategoryChange}
                  className="grow border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                >
                  <option value="">-- Choose a sub-category --</option>
                  {localCategories.map((cat) => (
                    <optgroup key={cat.id} label={cat.category_name}>
                      {cat.subcategories.map((sub) => (
                        <option key={sub.id} value={sub.id}>{sub.subcategory_name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                {/* Icon preview */}
                <div className="rounded-xl bg-green-500/10 p-3 flex items-center justify-center min-w-[44px] shrink-0">
                  <ServiceIconComponent iconName={selectedIcon} className="w-5 h-5 text-emerald-600 drop-shadow-sm" />
                </div>

                {/* + Sub-cat button */}
                <button
                  type="button"
                  onClick={() => setShowAddSubcategory(true)}
                  title="Add new sub-category"
                  className="shrink-0 rounded-lg border border-secondary/30 bg-secondary/10 hover:bg-secondary/20 text-secondary px-2.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1"
                >
                  <span className="text-base leading-none font-black">+</span> Sub-cat
                </button>

                {/* + Category button */}
                <button
                  type="button"
                  onClick={() => setShowAddCategory(true)}
                  title="Add new category"
                  className="shrink-0 rounded-lg border border-primary/20 bg-primary/10 hover:bg-primary/15 text-primary px-2.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1"
                >
                  <span className="text-base leading-none font-black">+</span> Category
                </button>
              </div>
            </div>
          </div>
          <ImageUploadField />
        </div>

        {/* ── Pricing Model ── */}
        <div>
          <h2 className="text-lg font-bold mb-3 border-b border-outline-variant/10 pb-2 text-primary">Pricing Model</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-on-surface-variant mb-2">Pricing Model</label>
              <select
                name="pricing_model"
                value={pricingModel}
                onChange={(e) => setPricingModel(e.target.value as "fixed" | "hourly")}
                className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              >
                <option value="fixed">Fixed Pricing (Outcome-Based)</option>
                <option value="hourly">Hourly Pricing (Duration-Based)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Pricing Details ── */}
        <div>
          <h2 className="text-lg font-bold mb-3 border-b border-outline-variant/10 pb-2 text-primary">Pricing Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-on-surface-variant mb-2">
                {pricingModel === "hourly" ? "Starting / Base Price (₹)" : "Service Starting at (₹)"}
              </label>
              <input name="base_price" required type="number" step="0.01" className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="e.g. 599.00" />
            </div>
            <div>
              <label className="block text-sm font-bold text-on-surface-variant mb-2">Original/Strike Price (Optional) (₹)</label>
              <input name="original_price" type="number" step="0.01" className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="e.g. 999.00" />
            </div>
            <div>
              <label className="block text-sm font-bold text-on-surface-variant mb-2">Price Breakdown (Optional)</label>
              <input name="price_breakdown" type="text" className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="e.g. ₹200 for each piece or seat" />
            </div>
          </div>

          {pricingModel === "hourly" && (
            <div className="mt-6 bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
              <h3 className="font-bold mb-3 text-primary text-sm">Duration Pricing Table</h3>
              <p className="text-xs text-on-surface-variant mb-4">Configure different duration options and their respective prices for this service.</p>
              <div className="space-y-3">
                {durationRates.map((rate, i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-on-surface-variant mb-1">Duration</label>
                      <select
                        value={rate.duration}
                        onChange={(e) => updateDurationRate(i, "duration", parseInt(e.target.value))}
                        className="w-full border border-outline-variant/20 rounded-lg p-2.5 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all"
                      >
                        <option value={30}>30 Minutes</option>
                        <option value={60}>1 Hour</option>
                        <option value={120}>2 Hours</option>
                        <option value={180}>3 Hours</option>
                        <option value={240}>4 Hours</option>
                        <option value={360}>6 Hours</option>
                        <option value={480}>8 Hours</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-on-surface-variant mb-1">Price (₹)</label>
                      <input
                        type="number"
                        value={rate.price}
                        min={1}
                        onChange={(e) => updateDurationRate(i, "price", parseFloat(e.target.value) || 0)}
                        className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all"
                        placeholder="Price"
                      />
                    </div>
                    {durationRates.length > 1 && (
                      <Button type="button" variant="outline" onClick={() => removeDurationRate(i)} className="mt-5 px-3">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </Button>
                    )}
                  </div>
                ))}
                <input type="hidden" name="duration_rates_json" value={JSON.stringify(durationRates)} />
                <Button type="button" variant="ghost" onClick={addDurationRate} className="w-full mt-2 text-sm text-secondary">
                  + Add Duration Option
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Description ── */}
        <div>
          <h2 className="text-lg font-bold mb-3 border-b border-outline-variant/10 pb-2 text-primary">Description</h2>
          <div>
            <label className="block text-sm font-bold text-on-surface-variant mb-2">About The Service</label>
            <textarea name="description" required rows={4} className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Detailed description for the service landing page..." />
          </div>
        </div>

        {/* ── Inclusions & Exclusions ── */}
        <div>
          <h2 className="text-lg font-bold mb-3 border-b border-outline-variant/10 pb-2 text-primary">Inclusions & Exclusions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-on-surface-variant mb-2">What&apos;s Included</label>
              <div className="space-y-3">
                {includedItems.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" value={item} onChange={(e) => updateItem(setIncludedItems, i, e.target.value)} className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="e.g. Complete dusting" />
                    {includedItems.length > 1 && (
                      <Button type="button" variant="outline" onClick={() => removeItem(setIncludedItems, i)} className="px-3">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </Button>
                    )}
                  </div>
                ))}
                <input type="hidden" name="included_features" value={includedItems.filter(Boolean).join('\n')} />
                <Button type="button" variant="ghost" onClick={() => addItem(setIncludedItems)} className="w-full mt-2 text-sm text-secondary">+ Add Item</Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-on-surface-variant mb-2">What&apos;s Excluded</label>
              <div className="space-y-3">
                {excludedItems.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" value={item} onChange={(e) => updateItem(setExcludedItems, i, e.target.value)} className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="e.g. Deep stain removal" />
                    {excludedItems.length > 1 && (
                      <Button type="button" variant="outline" onClick={() => removeItem(setExcludedItems, i)} className="px-3">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </Button>
                    )}
                  </div>
                ))}
                <input type="hidden" name="excluded_features" value={excludedItems.filter(Boolean).join('\n')} />
                <Button type="button" variant="ghost" onClick={() => addItem(setExcludedItems)} className="w-full mt-2 text-sm text-secondary">+ Add Item</Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── FAQs ── */}
        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
          <h3 className="font-bold mb-3 text-primary text-sm">Frequently Asked Questions</h3>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="flex flex-col gap-2 relative bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/20">
                {faqs.length > 1 && (
                  <button type="button" onClick={() => removeFaq(i)} className="absolute top-2 right-2 text-error hover:bg-error/10 p-1 rounded-md transition-colors">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                )}
                <input type="text" value={faq.question} onChange={(e) => updateFaq(i, "question", e.target.value)} className="w-full border-none rounded-lg p-2 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-semibold pr-8" placeholder="Question?" />
                <textarea value={faq.answer} onChange={(e) => updateFaq(i, "answer", e.target.value)} rows={2} className="w-full border-none rounded-lg p-2 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" placeholder="Answer..." />
              </div>
            ))}
            <input type="hidden" name="faqs_json" value={JSON.stringify(faqs.filter((f) => f.question.trim() && f.answer.trim()))} />
            <Button type="button" variant="ghost" onClick={addFaq} className="w-full text-sm text-secondary">+ Add Question</Button>
          </div>
        </div>

        {/* ── Submit ── */}
        <div className="flex justify-end gap-3 border-t border-outline-variant/10 pt-4 sticky bottom-0 bg-surface-container-lowest py-3 z-10">
          <Button type="submit" variant="primary" size="lg" disabled={isPending}>
            {isPending ? "Publishing..." : "Publish Service"}
          </Button>
        </div>
      </form>
    </>
  );
}
