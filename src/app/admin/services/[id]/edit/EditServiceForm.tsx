"use client";

import { useState, useActionState } from "react";
import { Button } from "@/components/ui/Button";

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

export function EditServiceForm({ 
  categories, 
  initialData, 
  action 
}: { 
  categories: Category[], 
  initialData: any,
  action: (prevState: any, formData: FormData) => Promise<any> 
}) {
  const [state, formAction, isPending] = useActionState(action, { type: null, message: null });
  
  const initialIcon = categories.flatMap(c => c.subcategories).find(s => s.id === initialData.subcategory_id)?.icon_name || "home";
  const [selectedIcon, setSelectedIcon] = useState<string>(initialIcon);
  
  const pageContent = initialData.page_content || {};
  const [includedItems, setIncludedItems] = useState<string[]>(pageContent.included_features?.length ? pageContent.included_features : [""]);
  const [excludedItems, setExcludedItems] = useState<string[]>(pageContent.excluded_features?.length ? pageContent.excluded_features : [""]);
  const [faqs, setFaqs] = useState<{question: string, answer: string}[]>(pageContent.faqs?.length ? pageContent.faqs : [{question: "", answer: ""}]);

  const handleSubcategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subcatId = e.target.value;
    for (const cat of categories) {
      const subcat = cat.subcategories.find((s) => s.id === subcatId);
      if (subcat) {
        setSelectedIcon(subcat.icon_name);
        return;
      }
    }
  };

  const updateItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    setter(prev => {
      const newItems = [...prev];
      newItems[index] = value;
      return newItems;
    });
  };

  const addItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => [...prev, ""]);
  };

  const removeItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const updateFaq = (index: number, field: "question" | "answer", value: string) => {
    setFaqs(prev => {
      const newFaqs = [...prev];
      newFaqs[index][field] = value;
      return newFaqs;
    });
  };

  const addFaq = () => {
    setFaqs(prev => [...prev, {question: "", answer: ""}]);
  };

  const removeFaq = (index: number) => {
    setFaqs(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <form action={formAction} className="space-y-6 bg-surface-container-lowest p-5 sm:p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-outline-variant/20">

      {state?.type === 'error' && (
        <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          <span className="text-sm font-bold">{state.message}</span>
        </div>
      )}
      {state?.type === 'success' && (
        <div className="bg-success/10 border border-success/20 text-success px-4 py-3 rounded-lg flex items-center gap-3">
          <span className="material-symbols-outlined">check_circle</span>
          <span className="text-sm font-bold">{state.message}</span>
        </div>
      )}

      {/* Top Section */}
      <div>
        <h2 className="text-lg font-bold mb-3 border-b border-outline-variant/10 pb-2 text-primary">Core Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-bold text-on-surface-variant mb-2">Service Title</label>
            <input name="title" required type="text" defaultValue={initialData.title} className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="e.g. Deep 3-Seater Sofa Shampooing" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-on-surface-variant mb-2">Select Sub-category</label>
            <div className="flex gap-4">
              <select name="subcategory_id" required defaultValue={initialData.subcategory_id || ""} className="grow border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all" onChange={handleSubcategoryChange}>
                <option value="">-- Choose a sub-category --</option>
                {categories.map(cat => (
                  <optgroup key={cat.id} label={cat.category_name}>
                    {cat.subcategories.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.subcategory_name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div className="rounded-xl bg-green-500/10 p-3 flex items-center justify-center min-w-[56px]">
                <span className="material-symbols-outlined text-success drop-shadow-sm">
                  {selectedIcon}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-on-surface-variant mb-2">Service Image URL (Optional)</label>
          <input name="image_url" type="text" defaultValue={initialData.image_url || ""} className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="e.g. /assets/services/sofa_cleaning.png or Cloudinary link" />
          <p className="text-[10px] text-on-surface-variant/70 mt-1">Supports local asset paths or external CDNs like Cloudinary, Imgur, etc.</p>
        </div>
      </div>

      {/* Price Section */}
      <div>
        <h2 className="text-lg font-bold mb-3 border-b border-outline-variant/10 pb-2 text-primary">Pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-on-surface-variant mb-2">Service Starting at (₹)</label>
            <input name="base_price" required type="number" step="0.01" defaultValue={initialData.base_price} className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="e.g. 599.00" />
          </div>
          <div>
            <label className="block text-sm font-bold text-on-surface-variant mb-2">Price Breakdown (Optional)</label>
            <input name="price_breakdown" type="text" defaultValue={initialData.price_breakdown || ""} className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="e.g. Rupee 200 for each piece or seat" />
          </div>
        </div>
      </div>

      {/* Middle Section: Description */}
      <div>
        <h2 className="text-lg font-bold mb-3 border-b border-outline-variant/10 pb-2 text-primary">Description</h2>
        <div>
          <label className="block text-sm font-bold text-on-surface-variant mb-2">About The Service</label>
          <textarea name="description" required rows={4} defaultValue={initialData.description} className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Detailed description for the service landing page..."></textarea>
        </div>
      </div>

      {/* Lists Section */}
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
              <Button type="button" variant="ghost" onClick={() => addItem(setIncludedItems)} className="w-full mt-2 text-sm text-secondary">
                + Add Item
              </Button>
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
              <Button type="button" variant="ghost" onClick={() => addItem(setExcludedItems)} className="w-full mt-2 text-sm text-secondary">
                + Add Item
              </Button>
            </div>
          </div>
        </div>
      </div>

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
              <textarea value={faq.answer} onChange={(e) => updateFaq(i, "answer", e.target.value)} rows={2} className="w-full border-none rounded-lg p-2 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" placeholder="Answer..."></textarea>
            </div>
          ))}
          <input type="hidden" name="faqs_json" value={JSON.stringify(faqs.filter(f => f.question.trim() && f.answer.trim()))} />
          <Button type="button" variant="ghost" onClick={addFaq} className="w-full text-sm text-secondary">
            + Add Question
          </Button>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-outline-variant/10 pt-4 sticky bottom-0 bg-surface-container-lowest py-3 z-10">
        <Button type="submit" variant="primary" size="lg" disabled={isPending}>
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
