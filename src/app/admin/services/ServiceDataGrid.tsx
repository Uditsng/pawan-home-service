"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ServiceIconComponent } from "@/utils/serviceIcon";
import { deleteService, duplicateService, toggleServiceStatus } from "@/app/admin/actions";
import { getServiceStatusDetails } from "@/utils/statusConfig";

interface ServiceItem {
  id: string;
  title: string;
  is_active: boolean;
  base_price: number;
  original_price?: number | null;
  category?: string | null;
  status?: string | null;
  subcategories?: {
    subcategory_name: string;
    icon_name: string | null;
    categories?: {
      category_name: string;
    } | null;
  } | null;
}

interface CategoryItem {
  id: string;
  category_name: string;
  subcategories: {
    id: string;
    subcategory_name: string;
  }[];
}

export function ServiceDataGrid({ services, categories }: { services: ServiceItem[], categories: CategoryItem[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState<string | null>(null);

  // Pagination & Compact view controls
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Filter services
  const filteredServices = services.filter((service) => {
    // Determine the active category and subcategory from relation if exists, else fallback to legacy
    const catName = service.subcategories?.categories?.category_name || service.category || "Uncategorized";
    const subcatName = service.subcategories?.subcategory_name || service.category || "General";

    // Search match
    const matchesSearch = service.title.toLowerCase().includes(searchTerm.toLowerCase());

    // Category match
    const matchesCategory = selectedCategory ? catName === selectedCategory : true;

    // Subcategory match
    const matchesSubcategory = selectedSubcategory ? subcatName === selectedSubcategory : true;

    // Status match
    const matchesStatus = selectedStatus ? (service.status || 'published') === selectedStatus : true;

    return matchesSearch && matchesCategory && matchesSubcategory && matchesStatus;
  });

  // Calculate pagination
  const totalItems = filteredServices.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentServices = filteredServices.slice(startIndex, startIndex + itemsPerPage);

  // Handle category change (reset subcategory)
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
    setSelectedSubcategory("");
    setCurrentPage(1);
  };

  // Get available subcategories for the selected category
  const activeCategoryObj = categories.find(c => c.category_name === selectedCategory);
  const availableSubcategories = activeCategoryObj ? activeCategoryObj.subcategories : [];

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);

  const handleDuplicate = async (serviceId: string) => {
    try {
      setIsDuplicating(serviceId);
      setErrorMsg(null);
      await duplicateService(serviceId);
    } catch (err: unknown) {
      setErrorMsg("Failed to duplicate service: " + ((err as Error).message || ""));
    } finally {
      setIsDuplicating(null);
    }
  };

  const handleToggleStatus = async (serviceId: string, currentStatus: string | null | undefined) => {
    try {
      setIsToggling(serviceId);
      setErrorMsg(null);
      await toggleServiceStatus(serviceId, (currentStatus || 'published') as 'draft' | 'published');
    } catch (err: unknown) {
      setErrorMsg("Failed to update status: " + ((err as Error).message || ""));
    } finally {
      setIsToggling(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return;
    try {
      setIsDeleting(deleteCandidate);
      setErrorMsg(null);
      await deleteService(deleteCandidate);
      // Let the server action revalidate the page. The candidate will close the modal on success implicitly because the page refreshes.
      setDeleteCandidate(null);
    } catch (err: unknown) {
      const errorMessage = (err as Error).message || "";
      if (errorMessage.includes("SERVICE_DEACTIVATED")) {
        setErrorMsg(errorMessage.replace("SERVICE_DEACTIVATED: ", ""));
        setDeleteCandidate(null);
      } else {
        setErrorMsg("Failed to delete service: " + errorMessage);
      }
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Error Message Banner */}
      {errorMsg && (
        <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg flex items-start gap-3">
          <span className="material-symbols-outlined shrink-0 mt-0.5">error</span>
          <div className="flex-1">
            <p className="text-sm font-bold">Action Failed</p>
            <p className="text-sm">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-error/60 hover:text-error">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/20 p-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-error mb-4">
              <span className="material-symbols-outlined text-3xl">warning</span>
              <h3 className="text-lg font-bold font-headline">Delete Service?</h3>
            </div>
            <p className="text-sm text-on-surface-variant mb-6">
              Are you sure you want to delete this service? If it has existing bookings, it will be deactivated instead to preserve historical records.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteCandidate(null)}
                disabled={!!isDeleting}
                className="px-4 py-2 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={!!isDeleting}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-error text-on-error hover:bg-error/90 shadow-sm shadow-error/20 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : null}
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar Section (Compact) */}
      <div className="bg-surface-container-lowest p-3 rounded-xl shadow-sm border border-outline-variant/20 flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-lg">search</span>
          <input
            type="text"
            placeholder="Search services..."
            className="w-full pl-9 pr-4 py-2 bg-surface-container rounded-lg border border-outline-variant/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all text-xs"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>

        {/* Category Dropdown */}
        <div className="w-full md:w-44">
          <select
            className="w-full px-3 py-2 bg-surface-container rounded-lg border border-outline-variant/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all text-xs appearance-none cursor-pointer"
            value={selectedCategory}
            onChange={handleCategoryChange}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.category_name}>{c.category_name}</option>
            ))}
          </select>
        </div>

        {/* Sub-category Dropdown */}
        <div className="w-full md:w-48">
          <select
            className="w-full px-3 py-2 bg-surface-container rounded-lg border border-outline-variant/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all text-xs appearance-none cursor-pointer disabled:opacity-50"
            value={selectedSubcategory}
            onChange={(e) => { setSelectedSubcategory(e.target.value); setCurrentPage(1); }}
            disabled={!selectedCategory}
          >
            <option value="">All Sub-categories</option>
            {availableSubcategories.map((sc: { id: string; subcategory_name: string }) => (
              <option key={sc.id} value={sc.subcategory_name}>{sc.subcategory_name}</option>
            ))}
          </select>
        </div>

        {/* Status Dropdown */}
        <div className="w-full md:w-36">
          <select
            className="w-full px-3 py-2 bg-surface-container rounded-lg border border-outline-variant/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all text-xs appearance-none cursor-pointer"
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Data Table Layout (Compact) */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/20 bg-surface-container-low/50">
                <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Icon</th>
                <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Title</th>
                <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Category / Sub-category</th>
                <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Status</th>
                <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Starting Price</th>
                <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {currentServices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-3xl opacity-20">search_off</span>
                      <p className="text-xs font-medium">No services found matching your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentServices.map((service) => {
                  const iconName = service.subcategories?.icon_name || "sparkles";
                  const catName = service.subcategories?.categories?.category_name || service.category || "Uncategorized";
                  const subcatName = service.subcategories?.subcategory_name || "General";
                  const statusDetails = getServiceStatusDetails(service.status);

                  return (
                    <tr key={service.id} className="hover:bg-surface-container-low/30 transition-colors group">
                      <td className="px-4 py-1.5 whitespace-nowrap">
                        <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                          <ServiceIconComponent iconName={iconName} className="w-4 h-4 text-emerald-600 drop-shadow-sm" />
                        </div>
                      </td>
                      <td className="px-4 py-1.5">
                        <div className="flex flex-col">
                          <span className="font-bold text-primary text-xs leading-tight">{service.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-1.5">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider leading-none mb-0.5">{catName}</span>
                          <span className="text-[10px] text-on-surface-variant/70 leading-none">{subcatName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(service.id, service.status)}
                          disabled={isToggling === service.id || isDeleting === service.id || !!isDuplicating}
                          className="hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                          title="Click to toggle status (Publish/Draft)"
                        >
                          {isToggling === service.id ? (
                            <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
                          ) : (
                            <Badge variant={statusDetails.badgeVariant} className="text-[8px] px-1.5 py-0 w-max tracking-wide">
                              {statusDetails.label}
                            </Badge>
                          )}
                          {!service.is_active && (
                            <Badge variant="danger" className="text-[8px] px-1.5 py-0 w-max tracking-wide">Inactive</Badge>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-1.5 whitespace-nowrap">
                        <div className="flex flex-col">
                          {service.original_price && (
                            <span className="text-[10px] text-on-surface-variant/50 line-through font-semibold">₹{Number(service.original_price).toLocaleString()}</span>
                          )}
                          <span className="font-bold text-primary text-xs">₹{Number(service.base_price).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-1.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleDuplicate(service.id)}
                            disabled={isDeleting === service.id || !!isDuplicating}
                            className="p-1 text-on-surface-variant hover:text-secondary hover:bg-secondary/15 rounded-lg transition-colors disabled:opacity-50"
                            title="Duplicate Service"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {isDuplicating === service.id ? 'hourglass_empty' : 'content_copy'}
                            </span>
                          </button>
                          <Link
                            href={`/admin/services/${service.id}/edit`}
                            className="p-1 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg transition-colors"
                            title="Edit Service"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </Link>
                          <button
                            onClick={() => setDeleteCandidate(service.id)}
                            disabled={isDeleting === service.id || !!isDuplicating}
                            className="p-1 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete Service"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {isDeleting === service.id ? 'hourglass_empty' : 'delete_forever'}
                            </span>
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

      {/* Bottom Section (Pagination & Info) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-3">
          <p className="text-xs font-medium text-on-surface-variant/60">
            Showing <span className="font-bold text-on-surface-variant">{totalItems === 0 ? 0 : startIndex + 1}</span> to <span className="font-bold text-on-surface-variant">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of <span className="font-bold text-on-surface-variant">{totalItems}</span> services
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
          <div className="flex items-center gap-1 bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${currentPage === page
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-on-surface-variant hover:bg-surface-container"
                  }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
