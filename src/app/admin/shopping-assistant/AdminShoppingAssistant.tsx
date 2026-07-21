"use client";

import React, { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AdminPackage, AdminBooking } from "./page";
import { savePackageAction, togglePackageAction, deletePackageAction } from "./actions";

interface AdminShoppingAssistantProps {
  initialPackages: AdminPackage[];
  initialBookings: AdminBooking[];
}

export default function AdminShoppingAssistant({
  initialPackages,
  initialBookings,
}: AdminShoppingAssistantProps) {
  const [packages, setPackages] = useState<AdminPackage[]>(initialPackages);
  const [bookings, setBookings] = useState<AdminBooking[]>(initialBookings);
  const [activeTab, setActiveTab] = useState<"packages" | "bookings">("packages");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Package modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<AdminPackage | null>(null);
  const [durationMinutes, setDurationMinutes] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [isPending, startTransition] = useTransition();
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Clear messages
  const clearMessages = () => {
    setActionSuccess(null);
    setActionError(null);
  };

  // Open modal for creating a new package
  const handleNewPackage = () => {
    clearMessages();
    setEditingPackage(null);
    setDurationMinutes("");
    setPrice("");
    setOriginalPrice("");
    setIsActive(true);
    setIsModalOpen(true);
  };

  // Open modal for editing an existing package
  const handleEditPackage = (pkg: AdminPackage) => {
    clearMessages();
    setEditingPackage(pkg);
    setDurationMinutes(String(pkg.duration_minutes));
    setPrice(String(pkg.price));
    setOriginalPrice(pkg.original_price ? String(pkg.original_price) : "");
    setIsActive(pkg.is_active);
    setIsModalOpen(true);
  };

  // Submit package save
  const handleSavePackageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    const dur = parseInt(durationMinutes, 10);
    const prc = parseFloat(price);
    const orig = originalPrice.trim() ? parseFloat(originalPrice) : null;

    if (isNaN(dur) || dur <= 0) {
      setActionError("Please enter a valid duration in minutes.");
      return;
    }
    if (isNaN(prc) || prc < 0) {
      setActionError("Please enter a valid price.");
      return;
    }
    if (orig !== null && (isNaN(orig) || orig < prc)) {
      setActionError("Original price must be greater than package price.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await savePackageAction({
          durationMinutes: dur,
          price: prc,
          originalPrice: orig,
          isActive,
        });

        if (res.success) {
          setActionSuccess(
            editingPackage
              ? "Package updated successfully!"
              : "New duration package created successfully!"
          );
          
          // Re-update local state
          const updatedPackages = [...packages];
          const matchIdx = updatedPackages.findIndex((p) => p.duration_minutes === dur);
          const pkgData: AdminPackage = {
            id: editingPackage?.id || "",
            service_id: "7e3a6a9b-6401-4f56-8360-7a0be7470dae",
            duration_minutes: dur,
            price: prc,
            original_price: orig,
            is_active: isActive,
          };

          if (matchIdx !== -1) {
            updatedPackages[matchIdx] = pkgData;
          } else {
            updatedPackages.push(pkgData);
          }
          // Sort packages by duration
          updatedPackages.sort((a, b) => a.duration_minutes - b.duration_minutes);
          setPackages(updatedPackages);
          setIsModalOpen(false);
        }
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : "Failed to save package.");
      }
    });
  };

  // Toggle package status directly
  const handleTogglePackage = (pkg: AdminPackage) => {
    clearMessages();
    const newStatus = !pkg.is_active;

    startTransition(async () => {
      try {
        const res = await togglePackageAction(pkg.duration_minutes, newStatus);
        if (res.success) {
          setPackages((prev) =>
            prev.map((p) =>
              p.duration_minutes === pkg.duration_minutes
                ? { ...p, is_active: newStatus }
                : p
            )
          );
          setActionSuccess(`Package status updated to ${newStatus ? "Active" : "Inactive"}.`);
        }
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : "Failed to toggle package.");
      }
    });
  };

  // Delete package
  const handleDeletePackage = (durationMinutes: number) => {
    if (!window.confirm("Are you sure you want to delete this package?")) return;
    clearMessages();

    startTransition(async () => {
      try {
        const res = await deletePackageAction(durationMinutes);
        if (res.success) {
          setPackages((prev) => prev.filter((p) => p.duration_minutes !== durationMinutes));
          setActionSuccess("Package deleted successfully.");
        }
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : "Failed to delete package.");
      }
    });
  };

  // Filter bookings based on search
  const filteredBookings = bookings.filter((b) => {
    const q = searchQuery.toLowerCase();
    const name = b.customer?.full_name.toLowerCase() || "";
    const email = b.customer?.email?.toLowerCase() || "";
    const phone = b.customer?.phone || "";
    const loc = b.meeting_location?.toLowerCase() || "";
    return name.includes(q) || email.includes(q) || phone.includes(q) || loc.includes(q);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary font-headline">
            CarryBuddy Packages Manager
          </h1>
          <p className="text-on-surface-variant font-medium mt-1 text-sm opacity-70">
            Configure hourly rates, discount structures, and monitor assistance service bookings.
          </p>
        </div>
        {activeTab === "packages" && (
          <Button
            onClick={handleNewPackage}
            className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-transform hover:scale-102"
          >
            <span className="material-symbols-outlined text-base">add</span> Add Custom Package
          </Button>
        )}
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 bg-secondary/10 border border-secondary/30 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-700 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-base">error</span>
          <span>{actionError}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-outline-variant/30 pb-px">
        <button
          onClick={() => setActiveTab("packages")}
          className={`px-5 py-3 font-headline font-bold text-sm border-b-2 transition-all ${
            activeTab === "packages"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-primary"
          }`}
        >
          Packages & Pricing
        </button>
        <button
          onClick={() => setActiveTab("bookings")}
          className={`px-5 py-3 font-headline font-bold text-sm border-b-2 transition-all ${
            activeTab === "bookings"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-primary"
          }`}
        >
          Bookings Monitor
        </button>
      </div>

      {/* Tab: Packages */}
      {activeTab === "packages" && (
        <div className="space-y-6">
          {/* Informational Guidelines Card */}
          <Card variant="outline" className="border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-2xl">info</span>
              <div className="space-y-1.5 text-xs text-on-surface-variant leading-relaxed">
                <p className="font-bold text-primary text-sm">Hourly Packages & Extensions System</p>
                <p>
                  CarryBuddy works as a duration-based service. Customers choose from these packages during checkout.
                  Additionally, these durations act as <strong>Extension Options</strong>. If a partner requests more time mid-trip (e.g. +30 Minutes or +1 Hour), the pricing is automatically loaded from the active values configured below.
                </p>
              </div>
            </div>
          </Card>

          {/* Grid of Packages */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => {
              const discount = pkg.original_price
                ? Math.round(((pkg.original_price - pkg.price) / pkg.original_price) * 100)
                : 0;

              return (
                <Card
                  key={pkg.id || pkg.duration_minutes}
                  variant="solid"
                  className="flex flex-col justify-between hover:shadow-lg transition-shadow duration-300 relative overflow-hidden"
                >
                  {/* Decorative corner tag for discount */}
                  {discount > 0 && pkg.is_active && (
                    <div className="absolute top-0 right-0 bg-secondary text-on-secondary px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-bl-xl">
                      {discount}% Off
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[#059669]">
                          {pkg.duration_minutes >= 60 ? "schedule" : "hourglass_bottom"}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-headline font-bold text-slate-800 text-lg">
                          {pkg.duration_minutes >= 60
                            ? `${pkg.duration_minutes / 60} Hour${
                                pkg.duration_minutes === 60 ? "" : "s"
                              }`
                            : `${pkg.duration_minutes} Minutes`}
                        </h3>
                        <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">
                          Duration: {pkg.duration_minutes} mins
                        </p>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-2 pt-2">
                      <span className="text-2xl font-bold text-primary">₹{pkg.price}</span>
                      {pkg.original_price && (
                        <span className="text-sm text-slate-400 line-through font-medium">
                          ₹{pkg.original_price}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-outline-variant/20 pt-4 mt-6">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-on-surface-variant">Active</span>
                      <button
                        onClick={() => handleTogglePackage(pkg)}
                        disabled={isPending}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          pkg.is_active ? "bg-secondary" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            pkg.is_active ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleEditPackage(pkg)}
                        className="p-1.5 hover:bg-surface-container rounded-lg text-primary transition-colors"
                        title="Edit Package"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button
                        onClick={() => handleDeletePackage(pkg.duration_minutes)}
                        className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-600 transition-colors"
                        title="Delete Package"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}

            {packages.length === 0 && (
              <div className="col-span-full py-16 text-center text-on-surface-variant font-medium">
                <span className="material-symbols-outlined text-4xl block mb-2 text-slate-300">
                  package
                </span>
                No CarryBuddy packages found. Click &quot;Add Custom Package&quot; above to get started.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Bookings */}
      {activeTab === "bookings" && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative max-w-md">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-lg">
              search
            </span>
            <input
              type="text"
              placeholder="Search by customer, phone, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/30 rounded-xl text-sm focus:outline-hidden focus:border-primary/50 text-slate-800 placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Bookings Table/Card List */}
          <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-outline-variant/20 bg-surface-dim/20 text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-4 px-6">Customer & Schedule</th>
                    <th className="py-4 px-4">Locations</th>
                    <th className="py-4 px-4">Duration & Bags</th>
                    <th className="py-4 px-4">Assigned Pro</th>
                    <th className="py-4 px-4">Status & Total</th>
                    <th className="py-4 px-6 text-center">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 font-medium text-slate-700">
                  {filteredBookings.map((b) => {
                    const scheduled = new Date(b.scheduled_date);
                    const formattedDate = scheduled.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "Asia/Kolkata",
                    });
                    const formattedTime = scheduled.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: "Asia/Kolkata",
                    });

                    // Set status badge variant
                    let statusVariant: "primary" | "surface" | "outline" | "success" | "warning" | "danger" = "warning";
                    if (b.status === "completed") statusVariant = "surface";
                    else if (b.status === "cancelled") statusVariant = "danger";
                    else if (b.status === "confirmed" || b.status === "accepted") statusVariant = "success";
                    else if (b.status === "in_progress") statusVariant = "primary";

                    return (
                      <tr key={b.id} className="hover:bg-surface-container-low/30 transition-colors">
                        <td className="py-4 px-6">
                          <p className="font-bold text-slate-800 text-sm">
                            {b.customer?.full_name || "Valued Customer"}
                          </p>
                          <p className="text-[10px] text-on-surface-variant mt-0.5">
                            {b.customer?.phone || "No phone"}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2 text-primary font-bold">
                            <span className="material-symbols-outlined text-sm">event</span>
                            <span>{formattedDate} · {formattedTime}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 max-w-xs">
                          <p className="font-semibold text-slate-800 flex items-start gap-1">
                            <span className="material-symbols-outlined text-xs text-[#059669] shrink-0 mt-0.5">location_on</span>
                            <span className="line-clamp-2">Meet: {b.meeting_location}</span>
                          </p>
                          {b.destination && (
                            <p className="text-on-surface-variant text-[11px] mt-1.5 flex items-start gap-1">
                              <span className="material-symbols-outlined text-xs text-slate-400 shrink-0 mt-0.5">pin_drop</span>
                              <span className="line-clamp-2">Drop: {b.destination}</span>
                            </p>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-bold text-slate-800">
                            {b.selected_duration_minutes
                              ? b.selected_duration_minutes >= 60
                                ? `${b.selected_duration_minutes / 60} Hour${
                                    b.selected_duration_minutes === 60 ? "" : "s"
                                  }`
                                : `${b.selected_duration_minutes} Mins`
                              : "—"}
                          </p>
                          <p className="text-on-surface-variant text-[10px] uppercase mt-1 tracking-wider">
                            {b.expected_bags} Expected Bags
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          {b.partner ? (
                            <div>
                              <p className="font-bold text-slate-800">{b.partner.full_name}</p>
                              <p className="text-[10px] text-on-surface-variant mt-0.5">
                                Phone: {b.partner.phone || "—"}
                              </p>
                            </div>
                          ) : b.status === "cancelled" ? (
                            <span className="text-slate-400 font-normal">No Pro assigned</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold uppercase tracking-wider animate-pulse">
                              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                              Broadcasting
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant={statusVariant} className="text-[9px]">
                            {b.status}
                          </Badge>
                          <p className="text-sm font-extrabold text-slate-800 mt-2">
                            ₹{b.total_amount}
                          </p>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {b.status === "completed" ? (
                            <a
                              href={`/customer/bookings/${b.id}/invoice`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:text-[#0F172A] font-bold underline transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">receipt</span>
                              Invoice
                            </a>
                          ) : (
                            <span className="text-slate-400 font-normal">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredBookings.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-on-surface-variant font-medium">
                        <span className="material-symbols-outlined text-3xl block mb-2 text-slate-300">
                          inbox
                        </span>
                        No CarryBuddy bookings match the search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Package Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-primary/40 backdrop-blur-xs"
            onClick={() => !isPending && setIsModalOpen(false)}
          />

          {/* Modal Container */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 md:p-8 max-w-md w-full relative z-10 animate-[zoomIn_0.2s_ease-out] text-slate-800">
            <h2 className="font-headline text-lg font-bold text-primary mb-1">
              {editingPackage ? "Edit CarryBuddy Package" : "Create New Duration Package"}
            </h2>
            <p className="text-xs text-on-surface-variant mb-6 font-medium">
              Specify duration in minutes and pricing. Dispatched listings and checkout details sync automatically.
            </p>

            <form onSubmit={handleSavePackageSubmit} className="space-y-4 font-medium text-xs">
              <div className="space-y-1">
                <label className="block text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 60 for 1 hour"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  disabled={isPending || editingPackage !== null}
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 font-semibold focus:outline-hidden focus:border-primary/50 disabled:opacity-50 disabled:bg-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                  Package Pricing (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 499"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={isPending}
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 font-semibold focus:outline-hidden focus:border-primary/50"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                  Discount Original Price (₹ - Optional)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 599 (to show strike-through discount)"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  disabled={isPending}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 font-semibold focus:outline-hidden focus:border-primary/50"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={isPending}
                  className="w-4 h-4 rounded border-slate-300 text-secondary focus:ring-secondary shrink-0"
                />
                <label htmlFor="isActiveCheck" className="text-slate-700 font-semibold select-none cursor-pointer">
                  Activate package for customer checkout
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                <Button
                  type="button"
                  variant="slate"
                  disabled={isPending}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isPending}
                  className="px-5 py-2 text-xs uppercase tracking-wider"
                >
                  {isPending ? "Saving..." : "Save Package"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
