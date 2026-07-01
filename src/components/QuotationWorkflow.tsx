"use client";

import React, { useState, useTransition } from "react";
import { createBookingQuoteAction, respondToQuoteAction, QuoteItemInput } from "@/app/actions/quotes";

interface QuotationWorkflowProps {
  bookingId: string;
  role: "customer" | "partner" | "admin";
  activeQuote?: any; // quote data if already exists
  onSuccess?: () => void;
}

export default function QuotationWorkflow({
  bookingId,
  role,
  activeQuote,
  onSuccess,
}: QuotationWorkflowProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Partner State (Creating a Quote)
  const [items, setItems] = useState<QuoteItemInput[]>([
    { item_type: "labour", name: "Standard Labor Charge", quantity: 1, unit_price: 0 },
  ]);
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState(0);

  // Calculate totals client-side for partner preview
  const subtotal = items.reduce((acc, it) => acc + Number(it.quantity) * Number(it.unit_price), 0);
  const tax = Math.round(subtotal * 0.18); // 18% GST standard
  const totalPayable = Math.max(0, subtotal + tax - discount);

  const handleAddItem = () => {
    setItems((prev) => [...prev, { item_type: "material", name: "", quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, key: keyof QuoteItemInput, val: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [key]: val,
      };
      return next;
    });
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Basic validation
    const hasEmptyNames = items.some((it) => !it.name.trim());
    if (hasEmptyNames) {
      setErrorMessage("Please enter a description for all quote items.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createBookingQuoteAction(bookingId, items, 18, discount, notes);
        if (res.success) {
          setSuccessMessage("Quotation submitted successfully!");
          if (onSuccess) onSuccess();
        }
      } catch (err) {
        setErrorMessage((err as Error).message || "Failed to submit quotation.");
      }
    });
  };

  const handleRespondQuote = async (approve: boolean) => {
    if (!activeQuote) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const res = await respondToQuoteAction(activeQuote.id, approve);
        if (res.success) {
          setSuccessMessage(approve ? "Quotation approved!" : "Quotation declined.");
          if (onSuccess) onSuccess();
        }
      } catch (err) {
        setErrorMessage((err as Error).message || "Failed to update quotation response.");
      }
    });
  };

  // Render Client (Customer Viewer)
  if (role === "customer" || role === "admin") {
    if (!activeQuote) {
      return (
        <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/10 text-center text-xs text-on-surface-variant font-medium">
          No active quotation pending. The professional will inspect and submit details shortly.
        </div>
      );
    }

    const isPendingApproval = activeQuote.status === "pending_customer_approval";

    return (
      <div className="bg-white border border-outline-variant/15 rounded-3xl p-5 md:p-6 shadow-xs space-y-6 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex justify-between items-start border-b border-outline-variant/15 pb-4">
          <div>
            <h3 className="font-headline text-base font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600">receipt</span> Service Quotation
            </h3>
            <p className="text-[10px] text-on-surface-variant/70 font-medium uppercase tracking-wider mt-1">
              Ref: QUOTE-{activeQuote.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
              isPendingApproval
                ? "bg-warning/10 text-warning border-warning/20"
                : activeQuote.status === "approved"
                ? "bg-green-500/10 text-emerald-600 border-green-500/20"
                : "bg-red-500/10 text-red-600 border-red-500/20"
            }`}
          >
            {activeQuote.status.replace(/_/g, " ")}
          </span>
        </div>

        {/* Message Badges */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200/50 rounded-2xl p-4 flex items-start gap-2 text-red-800 text-xs font-semibold">
            <span className="material-symbols-outlined text-red-600 text-sm">error</span>
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border border-green-200/50 rounded-2xl p-4 flex items-start gap-2 text-emerald-800 text-xs font-semibold">
            <span className="material-symbols-outlined text-emerald-600 text-sm">check_circle</span>
            {successMessage}
          </div>
        )}

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-medium text-on-surface-variant">
            <thead>
              <tr className="border-b border-outline-variant/10 text-[10px] font-bold text-on-surface uppercase tracking-wider">
                <th className="py-2">Description</th>
                <th className="py-2 text-center">Type</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Price</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {activeQuote.booking_quote_items?.map((item: any) => (
                <tr key={item.id}>
                  <td className="py-3 font-bold text-on-surface">{item.name}</td>
                  <td className="py-3 text-center capitalize">{item.item_type}</td>
                  <td className="py-3 text-center">{item.quantity}</td>
                  <td className="py-3 text-right">₹{item.unit_price}</td>
                  <td className="py-3 text-right font-bold text-primary">₹{item.total_price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="border-t border-outline-variant/15 pt-4 space-y-2.5 text-xs text-on-surface-variant font-medium">
          {activeQuote.notes && (
            <div className="bg-surface p-3.5 rounded-xl border border-outline-variant/10 text-xs leading-relaxed mb-4">
              <strong className="block text-primary text-[10px] uppercase font-bold tracking-wider mb-1">Notes from Professional:</strong>
              {activeQuote.notes}
            </div>
          )}

          <div className="flex justify-between">
            <span>Tax (GST 18%)</span>
            <span>+₹{Math.round(activeQuote.total_amount * 0.15)}</span> {/* rough dynamic preview */}
          </div>
          {activeQuote.discount > 0 && (
            <div className="flex justify-between font-bold text-emerald-600">
              <span>Applied Discount</span>
              <span>-₹{activeQuote.discount}</span>
            </div>
          )}
          <hr className="border-t border-dashed border-outline-variant/30" />
          <div className="flex justify-between items-baseline pt-1">
            <span className="text-sm font-bold text-on-surface">Grand Total</span>
            <span className="text-xl font-black text-primary font-headline">₹{activeQuote.total_amount}</span>
          </div>
        </div>

        {/* Action Controls for Customer */}
        {isPendingApproval && isPendingApproval && role === "customer" && (
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => handleRespondQuote(false)}
              disabled={isPending}
              className="flex-1 py-3 border border-outline-variant/20 rounded-xl font-bold text-xs uppercase tracking-wider text-center hover:bg-surface-container-low transition-colors disabled:opacity-40 cursor-pointer text-slate-700"
            >
              Decline Quote
            </button>
            <button
              onClick={() => handleRespondQuote(true)}
              disabled={isPending}
              className="flex-1 py-3 bg-secondary text-white rounded-xl font-bold text-xs uppercase tracking-widest text-center shadow-lg shadow-secondary/15 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 cursor-pointer"
            >
              Approve & Proceed
            </button>
          </div>
        )}
      </div>
    );
  }

  // Render Partner / Pro view (Create Quote)
  return (
    <form onSubmit={handleSubmitQuote} className="bg-white border border-outline-variant/15 rounded-3xl p-5 md:p-6 shadow-xs space-y-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

      <h3 className="font-headline text-base font-bold text-primary border-b border-outline-variant/15 pb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-emerald-600">border_color</span> Create Work Quotation
      </h3>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200/50 rounded-2xl p-4 flex items-start gap-2 text-red-800 text-xs font-semibold">
          <span className="material-symbols-outlined text-red-600 text-sm">error</span>
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200/50 rounded-2xl p-4 flex items-start gap-2 text-emerald-800 text-xs font-semibold">
          <span className="material-symbols-outlined text-emerald-600 text-sm">check_circle</span>
          {successMessage}
        </div>
      )}

      {/* Items List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
          <span>Quote Items</span>
          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-1 text-primary hover:underline font-bold"
          >
            <span className="material-symbols-outlined text-xs">add</span> Add Line Item
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-surface p-3 rounded-2xl border border-outline-variant/10 relative">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 flex-1 w-full">
                {/* Description */}
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={item.name}
                    placeholder="e.g. Copper piping, Pipe fitting labor"
                    onChange={(e) => handleItemChange(index, "name", e.target.value)}
                    className="w-full text-xs font-bold bg-white border border-outline-variant/20 rounded-xl p-2.5 outline-none focus:border-primary transition-colors"
                  />
                </div>
                {/* Type Selection */}
                <div>
                  <select
                    value={item.item_type}
                    onChange={(e) => handleItemChange(index, "item_type", e.target.value as any)}
                    className="w-full text-xs font-semibold bg-white border border-outline-variant/20 rounded-xl p-2.5 outline-none"
                  >
                    <option value="labour">Labor</option>
                    <option value="material">Material</option>
                  </select>
                </div>
                {/* Qty & Price */}
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={item.quantity}
                    min={1}
                    onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value, 10) || 1)}
                    className="w-16 text-center text-xs font-extrabold bg-white border border-outline-variant/20 rounded-xl p-2.5 outline-none"
                  />
                  <input
                    type="number"
                    value={item.unit_price}
                    min={0}
                    placeholder="Unit Price"
                    onChange={(e) => handleItemChange(index, "unit_price", parseFloat(e.target.value) || 0)}
                    className="w-full text-right text-xs font-extrabold bg-white border border-outline-variant/20 rounded-xl p-2.5 outline-none"
                  />
                </div>
              </div>

              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="text-red-500 hover:text-red-700 shrink-0 text-xs font-bold"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Surcharge Note / Discount */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Quote Notes / Exclusions</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Include warranty details, material details, or exclusions here."
            className="w-full text-xs bg-surface border border-outline-variant/20 rounded-xl p-3 outline-none focus:border-primary transition-all resize-none font-medium placeholder:font-normal"
          />
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Apply Discount (₹)</label>
            <input
              type="number"
              value={discount}
              min={0}
              onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full text-xs font-extrabold bg-surface border border-outline-variant/20 rounded-xl p-2.5 outline-none"
            />
          </div>
          {/* Dynamic Invoice Preview */}
          <div className="bg-surface p-3.5 rounded-xl border border-outline-variant/10 text-xs font-medium space-y-1.5">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-extrabold text-on-surface">₹{subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span>GST (18%):</span>
              <span className="font-extrabold text-on-surface">₹{tax}</span>
            </div>
            <div className="flex justify-between items-baseline border-t border-outline-variant/15 pt-2 font-bold">
              <span>Total Bill Estimate:</span>
              <span className="text-base font-black text-primary font-headline">₹{totalPayable}</span>
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest text-center shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 cursor-pointer"
      >
        {isPending ? "Sending Quote..." : "Send Quote to Customer"}
      </button>
    </form>
  );
}
