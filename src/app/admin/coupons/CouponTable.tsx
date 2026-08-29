"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Coupon } from "@/lib/types";

export type CouponRow = Coupon & {
  services: { title: string } | null;
};

interface CouponTableProps {
  coupons: CouponRow[];
  deleteCouponAction: (id: string) => Promise<{ error?: string }>;
  toggleCouponActiveAction: (id: string, isActive: boolean) => Promise<{ error?: string }>;
}

function formatValue(c: Coupon) {
  return c.discount_type === "percentage"
    ? `${c.discount_value}%`
    : `₹${c.discount_value}`;
}

export function CouponTable({
  coupons,
  deleteCouponAction,
  toggleCouponActiveAction,
}: CouponTableProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Computed metrics
  const totalCoupons = coupons.length;
  const activeCount = coupons.filter((c) => c.is_active).length;
  const inactiveCount = coupons.filter((c) => !c.is_active).length;
  const percentageCount = coupons.filter((c) => c.discount_type === "percentage").length;
  const fixedCount = coupons.filter((c) => c.discount_type === "fixed").length;

  // Filter coupons
  const filteredCoupons = coupons.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.services?.title || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      selectedStatus === "active"
        ? c.is_active
        : selectedStatus === "inactive"
        ? !c.is_active
        : true;
    const matchesType = selectedType ? c.discount_type === selectedType : true;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Pagination bounds
  const totalItems = filteredCoupons.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentCoupons = filteredCoupons.slice(startIndex, startIndex + itemsPerPage);

  const onToggle = (c: CouponRow) => {
    setError(null);
    startTransition(async () => {
      const res = await toggleCouponActiveAction(c.id, !c.is_active);
      if (res?.error) setError(res.error);
    });
  };

  const onConfirmDelete = (id: string) => {
    setError(null);
    startTransition(async () => {
      const res = await deleteCouponAction(id);
      if (res?.error) setError(res.error);
      setConfirmId(null);
    });
  };

  return (
    <div className="space-y-4">
      {/* Error Banner */}
      {error && (
        <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl flex items-start gap-3">
          <span className="material-symbols-outlined shrink-0 mt-0.5">error</span>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wider">Action Failed</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-error/60 hover:text-error transition-colors">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

      {/* ─── 1. METRICS CARDS GRID ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/15 shadow-xs">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">
            Total Coupons
          </p>
          <p className="text-2xl font-bold text-primary font-headline mt-1">{totalCoupons}</p>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/15 shadow-xs">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">
            Active
          </p>
          <p className="text-2xl font-bold text-secondary font-headline mt-1">{activeCount}</p>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/15 shadow-xs">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">
            Inactive
          </p>
          <p className="text-2xl font-bold text-amber-600 font-headline mt-1">{inactiveCount}</p>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/15 shadow-xs">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">
            Percentage Off (%)
          </p>
          <p className="text-2xl font-bold text-primary font-headline mt-1">{percentageCount}</p>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/15 shadow-xs">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">
            Fixed Amount Off (₹)
          </p>
          <p className="text-2xl font-bold text-primary font-headline mt-1">{fixedCount}</p>
        </div>
      </div>

      {/* ─── 2. FILTERS & SEARCH BAR ───────────────────────────── */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 shadow-xs p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-lg">
              search
            </span>
            <input
              type="text"
              placeholder="Search by coupon code or service name..."
              className="w-full pl-9 pr-4 py-2 bg-surface-container rounded-lg border border-outline-variant/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all text-xs font-medium text-on-surface placeholder:text-on-surface-variant/50"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-40">
            <select
              className="w-full px-3 py-2 bg-surface-container rounded-lg border border-outline-variant/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all text-xs font-medium text-on-surface cursor-pointer"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Discount Type Filter */}
          <div className="w-full sm:w-44">
            <select
              className="w-full px-3 py-2 bg-surface-container rounded-lg border border-outline-variant/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all text-xs font-medium text-on-surface cursor-pointer"
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Types</option>
              <option value="percentage">Percentage Off (%)</option>
              <option value="fixed">Fixed Amount Off (₹)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── 3. DATA TABLE ─────────────────────────────────────── */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/20 bg-surface-container-low/50">
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">
                  Coupon Code
                </th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">
                  Discount
                </th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">
                  Minimum Order
                </th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">
                  Usage Limit
                </th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">
                  Applies To
                </th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">
                  Expiry Date
                </th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">
                  Status
                </th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {currentCoupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-on-surface-variant/40 mb-1">
                        <span className="material-symbols-outlined text-2xl">local_offer</span>
                      </div>
                      <p className="text-sm font-bold text-primary font-headline">No coupons found</p>
                      <p className="text-xs opacity-60">
                        {searchTerm || selectedStatus || selectedType
                          ? "Try changing your search or filters."
                          : "Click 'Create New Coupon' to add your first discount code."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentCoupons.map((c) => {
                  const isExpired = c.expires_at ? new Date(c.expires_at) < new Date() : false;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-surface-container-low/30 transition-colors group"
                    >
                      {/* Code */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 font-mono font-bold tracking-wider text-xs uppercase">
                          <span className="material-symbols-outlined text-xs">local_offer</span>
                          {c.code}
                        </div>
                      </td>

                      {/* Discount */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-primary text-xs">
                            {formatValue(c)}
                          </span>
                          {c.discount_type === "percentage" && c.max_discount && (
                            <span className="text-[10px] text-on-surface-variant/70 font-medium">
                              Max discount: ₹{c.max_discount}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Min Order */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {c.min_booking_amount > 0 ? (
                          <span className="font-semibold text-xs text-on-surface">
                            ₹{c.min_booking_amount}
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-semibold text-on-surface-variant/60 bg-surface-container px-2 py-0.5 rounded-md">
                            No Minimum
                          </span>
                        )}
                      </td>

                      {/* Limits */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-on-surface-variant">
                        <div className="flex flex-col gap-0.5 text-[11px]">
                          <span>
                            Per customer: <strong className="text-on-surface font-semibold">{c.limit_per_user}</strong>
                          </span>
                          <span className="text-on-surface-variant/70">
                            Total uses: <strong className="text-on-surface font-semibold">{c.total_limit ?? "Unlimited"}</strong>
                          </span>
                        </div>
                      </td>

                      {/* Applies To */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {c.services?.title ? (
                          <span className="font-semibold text-primary text-xs truncate max-w-45 block" title={c.services.title}>
                            {c.services.title}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-secondary bg-secondary/10 border border-secondary/20 px-2 py-0.5 rounded-md">
                            <span className="material-symbols-outlined text-[12px]">public</span>
                            All Services
                          </span>
                        )}
                      </td>

                      {/* Expiry */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {c.expires_at ? (
                          <div className="flex flex-col">
                            <span className={`font-medium ${isExpired ? "text-error" : "text-on-surface-variant"}`}>
                              {new Date(c.expires_at).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                            {isExpired && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-error">
                                Expired
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-on-surface-variant/60 text-xs">Never</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge
                          variant={c.is_active && !isExpired ? "success" : "outline"}
                          className="text-[9px] px-2 py-0.5"
                        >
                          {c.is_active ? (isExpired ? "Expired" : "Active") : "Inactive"}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle Active */}
                          <button
                            onClick={() => onToggle(c)}
                            disabled={isPending}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors disabled:opacity-50"
                            title={c.is_active ? "Deactivate Coupon" : "Activate Coupon"}
                          >
                            <span className="material-symbols-outlined text-base">
                              {c.is_active ? "toggle_on" : "toggle_off"}
                            </span>
                          </button>

                          {/* Edit */}
                          <Link
                            href={`/admin/coupons/${c.id}/edit`}
                            className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all flex items-center justify-center"
                            title="Edit Coupon"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </Link>

                          {/* Delete */}
                          <button
                            onClick={() => setConfirmId(c.id)}
                            disabled={isPending}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                            title="Delete Coupon"
                          >
                            <span className="material-symbols-outlined text-sm">delete_forever</span>
                          </button>
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

      {/* ─── 4. PAGINATION FOOTER ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1 py-1">
        <div className="flex items-center gap-3">
          <p className="text-xs font-medium text-on-surface-variant/70">
            Showing <span className="font-bold text-on-surface">{totalItems === 0 ? 0 : startIndex + 1}</span> to{" "}
            <span className="font-bold text-on-surface">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of{" "}
            <span className="font-bold text-on-surface">{totalItems}</span> coupons
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-on-surface-variant/30">·</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-surface-container rounded-lg border border-outline-variant/20 text-xs text-on-surface-variant outline-none cursor-pointer"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>

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
                  currentPage === page
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-on-surface-variant hover:bg-surface-container"
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

      {/* ─── 5. DELETE CONFIRMATION MODAL ──────────────────────── */}
      {confirmId && (
        <ConfirmDelete
          code={coupons.find((c) => c.id === confirmId)?.code ?? ""}
          onCancel={() => setConfirmId(null)}
          onConfirm={() => onConfirmDelete(confirmId)}
          isPending={isPending}
        />
      )}
    </div>
  );
}

function ConfirmDelete({
  code,
  onCancel,
  onConfirm,
  isPending,
}: {
  code: string;
  onCancel: () => void;
  onConfirm: () => void;
  isPending?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/20 p-6 max-w-sm w-full animate-in zoom-in-95 duration-200 space-y-4">
        <div className="flex items-center gap-3 text-error">
          <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">warning</span>
          </div>
          <h3 className="text-lg font-bold text-primary font-headline">
            Delete Coupon?
          </h3>
        </div>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          Are you sure you want to delete coupon <span className="font-bold font-mono text-primary uppercase">{code}</span>?
          If customers have already used this coupon, deactivate it instead of deleting.
        </p>
        <div className="flex justify-end gap-2.5 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-xl border-outline-variant/30 text-xs font-bold"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirm}
            disabled={isPending}
            className="bg-error hover:bg-error/90 text-white rounded-xl text-xs font-bold shadow-sm shadow-error/20"
          >
            {isPending ? (
              <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
            ) : null}
            {isPending ? "Deleting..." : "Delete Coupon"}
          </Button>
        </div>
      </div>
    </div>
  );
}

