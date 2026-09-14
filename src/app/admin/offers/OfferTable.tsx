"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import {
  toggleOfferStatusAction,
  deleteOfferAction,
  type OfferFormState,
} from "./actions";
import { formatOfferBenefit, offerTypeLabel, isOfferCurrentlyActive } from "@/lib/offers/format";

export type OfferRow = {
  id: string;
  code: string;
  name: string;
  title: string;
  offer_type: "FIXED_DISCOUNT" | "PERCENTAGE_DISCOUNT" | "SERVICE_CREDIT";
  purchase_price: number;
  benefit_value: number;
  max_discount: number | null;
  min_booking_amount: number;
  validity_model: "fixed_dates" | "relative_days";
  valid_from: string | null;
  valid_until: string | null;
  valid_days: number | null;
  status: "draft" | "active" | "paused" | "expired" | "archived";
  created_at: string;
  serviceCount: number;
  totalPurchases: number;
  totalEntitlements: number;
};

interface OfferTableProps {
  offers: OfferRow[];
}

const STATUS_OPTIONS: OfferRow["status"][] = ["draft", "active", "paused", "expired", "archived"];

function statusBadgeVariant(status: OfferRow["status"], active: boolean): React.ComponentProps<typeof Badge>["variant"] {
  if (status === "active") return active ? "success" : "warning";
  if (status === "paused") return "warning";
  if (status === "archived") return "outline";
  if (status === "expired") return "outline";
  return "outline";
}

export function OfferTable({ offers }: OfferTableProps) {
  const [isPending, startTransition] = useTransition();
  const [statusResult, setStatusResult] = useState<OfferFormState>({ type: null, message: null });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  const total = offers.length;
  const activeCount = offers.filter((o) => o.status === "active").length;
  const draftCount = offers.filter((o) => o.status === "draft").length;
  const liveSales = offers.reduce((sum, o) => sum + o.totalPurchases, 0);
  const totalCredited = offers.reduce((sum, o) => sum + o.totalEntitlements, 0);

  const filtered = offers.filter((o) => {
    const matchesSearch =
      o.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter ? o.offer_type === typeFilter : true;
    const matchesStatus = statusFilter ? o.status === statusFilter : true;
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentOffers = filtered.slice(startIndex, startIndex + itemsPerPage);

  const onToggle = (offer: OfferRow, newStatus: OfferRow["status"]) => {
    setStatusResult({ type: null, message: null });
    const formData = new FormData();
    formData.set("offer_id", offer.id);
    formData.set("new_status", newStatus);
    startTransition(async () => {
      const res = await toggleOfferStatusAction(formData);
      if (res?.error) {
        setStatusResult({ type: "error", message: res.error });
      } else {
        setStatusResult({ type: "success", message: `${offer.code} → ${newStatus}` });
        window.setTimeout(() => setStatusResult({ type: null, message: null }), 3000);
      }
    });
  };

  const onConfirmDelete = (id: string) => {
    setStatusResult({ type: null, message: null });
    const formData = new FormData();
    formData.set("offer_id", id);
    startTransition(async () => {
      const res = await deleteOfferAction(formData);
      if (res?.error) {
        setStatusResult({ type: "error", message: res.error });
      }
      setConfirmDeleteId(null);
    });
  };

  const validityLabel = (o: OfferRow) => {
    if (o.validity_model === "fixed_dates" && o.valid_from && o.valid_until) {
      return `${new Date(o.valid_from).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${new Date(o.valid_until).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    if (o.validity_model === "relative_days" && o.valid_days) {
      return `${o.valid_days} days after purchase`;
    }
    return "—";
  };

  return (
    <div className="space-y-4">
      {statusResult.message && (
        <div
          className={`px-4 py-3 rounded-xl flex items-start gap-3 text-xs font-medium ${
            statusResult.type === "error"
              ? "bg-error/10 border border-error/20 text-error"
              : "bg-secondary/10 border border-secondary/30 text-primary"
          }`}
        >
          <span className="material-symbols-outlined shrink-0 mt-0.5 text-base">
            {statusResult.type === "error" ? "error" : "check_circle"}
          </span>
          <p className="flex-1">{statusResult.message}</p>
          <button onClick={() => setStatusResult({ type: null, message: null })} className="opacity-60 hover:opacity-100">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/15 shadow-xs">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">Total Offers</p>
          <p className="text-2xl font-bold text-primary font-headline mt-1">{total}</p>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/15 shadow-xs">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">Live (Active)</p>
          <p className="text-2xl font-bold text-secondary font-headline mt-1">{activeCount}</p>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/15 shadow-xs">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">Drafts</p>
          <p className="text-2xl font-bold text-amber-600 font-headline mt-1">{draftCount}</p>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/15 shadow-xs">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">Purchases</p>
          <p className="text-2xl font-bold text-primary font-headline mt-1">{liveSales}</p>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/15 shadow-xs">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">Entitlements Issued</p>
          <p className="text-2xl font-bold text-primary font-headline mt-1">{totalCredited}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 shadow-xs p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-lg">search</span>
            <input
              type="text"
              placeholder="Search by offer code, name, or title..."
              className="w-full pl-9 pr-4 py-2 bg-surface-container rounded-lg border border-outline-variant/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all text-xs font-medium text-on-surface placeholder:text-on-surface-variant/50"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <select
            className="w-full sm:w-44 px-3 py-2 bg-surface-container rounded-lg border border-outline-variant/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all text-xs font-medium text-on-surface cursor-pointer"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Types</option>
            <option value="FIXED_DISCOUNT">Fixed Discount</option>
            <option value="PERCENTAGE_DISCOUNT">Percentage Discount</option>
            <option value="SERVICE_CREDIT">Service Credit</option>
          </select>
          <select
            className="w-full sm:w-40 px-3 py-2 bg-surface-container rounded-lg border border-outline-variant/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all text-xs font-medium text-on-surface cursor-pointer"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="expired">Expired</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/20 bg-surface-container-low/50">
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">Offer</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">Type</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">Benefit</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">Price</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">Validity</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">Services</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">Sales</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">Status</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {currentOffers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-on-surface-variant/40 mb-1">
                        <span className="material-symbols-outlined text-2xl">local_activity</span>
                      </div>
                      <p className="text-sm font-bold text-primary font-headline">No offers found</p>
                      <p className="text-xs opacity-60">
                        {searchTerm || typeFilter || statusFilter
                          ? "Try changing your search or filters."
                          : "Click 'Create New Offer' to add your first offer card."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentOffers.map((o) => {
                  const live = isOfferCurrentlyActive(o);
                  return (
                    <tr key={o.id} className="hover:bg-surface-container-low/30 transition-colors group">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-lg">local_activity</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-primary text-xs truncate max-w-44" title={o.title}>
                              {o.title}
                            </p>
                            <p className="text-[10px] text-on-surface-variant/70 font-mono font-semibold uppercase tracking-wider">{o.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-on-surface-variant">{offerTypeLabel(o.offer_type)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-bold text-secondary">{formatOfferBenefit(o)}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {o.purchase_price > 0 ? (
                          <span className="font-semibold text-on-surface">₹{o.purchase_price}</span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-secondary/10 border border-secondary/20 px-2 py-0.5 text-[10px] font-bold text-secondary">
                            Free
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-on-surface-variant">{validityLabel(o)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-md bg-surface-container px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                          {o.serviceCount} service{o.serviceCount === 1 ? "" : "s"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-on-surface-variant">
                        <span className="font-semibold text-on-surface">{o.totalPurchases}</span>
                        <span className="opacity-60"> purchased · {o.totalEntitlements} entitled</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={statusBadgeVariant(o.status, live)} className="text-[9px] px-2 py-0.5">
                          {o.status === "active" && !live ? "Active (expired)" : o.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/admin/offers/${o.id}`}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                            title="View offer details"
                          >
                            <span className="material-symbols-outlined text-base">visibility</span>
                          </Link>
                          <Link
                            href={`/admin/offers/${o.id}/edit`}
                            className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all flex items-center justify-center"
                            title="Edit Offer"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </Link>
                          <select
                            value={o.status}
                            disabled={isPending}
                            onChange={(e) => onToggle(o, e.target.value as OfferRow["status"])}
                            className="px-2 py-1.5 bg-surface-container rounded-lg border border-outline-variant/20 text-[11px] font-semibold text-on-surface-variant outline-none cursor-pointer disabled:opacity-50"
                            title="Change status"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          {o.status === "draft" && (
                            <button
                              onClick={() => setConfirmDeleteId(o.id)}
                              disabled={isPending}
                              className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                              title="Delete draft offer"
                            >
                              <span className="material-symbols-outlined text-sm">delete_forever</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1 py-1">
        <p className="text-xs font-medium text-on-surface-variant/70">
          Showing <span className="font-bold text-on-surface">{totalItems === 0 ? 0 : startIndex + 1}</span> to{" "}
          <span className="font-bold text-on-surface">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of{" "}
          <span className="font-bold text-on-surface">{totalItems}</span> offers
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1 bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-1 shadow-xs">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary disabled:opacity-30 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                  currentPage === page ? "bg-primary text-white shadow-md shadow-primary/20" : "text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary disabled:opacity-30 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/20 p-6 max-w-sm w-full animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center gap-3 text-error">
              <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">warning</span>
              </div>
              <h3 className="text-lg font-bold text-primary font-headline">Delete draft offer?</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Are you sure you want to delete this draft offer? This cannot be undone. Offers with any purchases must be archived instead.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={isPending}
                className="px-4 py-2 rounded-xl border border-outline-variant/30 text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirmDelete(confirmDeleteId)}
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-error hover:bg-error/90 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                {isPending && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                {isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}