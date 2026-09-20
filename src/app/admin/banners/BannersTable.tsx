"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import {
  toggleBannerActiveAction,
  deleteBannerAction,
  type BannerFormState,
} from "./actions";
import type { BannerRow } from "./BannerForm";

interface BannersTableProps {
  banners: BannerRow[];
}

export function BannersTable({ banners }: BannersTableProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<BannerFormState>({ type: null, message: null });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const total = banners.length;
  const activeCount = banners.filter((b) => b.is_active).length;

  const showResult = (res: { error?: string } | undefined, successMsg: string) => {
    if (res?.error) {
      setResult({ type: "error", message: res.error });
    } else {
      setResult({ type: "success", message: successMsg });
      window.setTimeout(() => setResult({ type: null, message: null }), 3000);
    }
  };

  const onToggle = (banner: BannerRow) => {
    setResult({ type: null, message: null });
    const formData = new FormData();
    formData.set("banner_id", banner.id);
    formData.set("new_active", String(!banner.is_active));
    startTransition(async () => {
      showResult(await toggleBannerActiveAction(formData), `${banner.title} → ${banner.is_active ? "hidden" : "live"}`);
    });
  };

  // const onReorder = (banner: BannerRow, direction: "up" | "down") => {
  //   setResult({ type: null, message: null });
  //   const formData = new FormData();
  //   formData.set("banner_id", banner.id);
  //   formData.set("direction", direction);
  //   startTransition(async () => {
  //     showResult(await reorderBannerAction(formData), `Moved ${banner.title} ${direction}`);
  //   });
  // };

  const onConfirmDelete = (id: string) => {
    setResult({ type: null, message: null });
    const formData = new FormData();
    formData.set("banner_id", id);
    startTransition(async () => {
      showResult(await deleteBannerAction(formData), "Banner deleted");
      setConfirmDeleteId(null);
    });
  };

  return (
    <div className="space-y-4">
      {result.message && (
        <div
          className={`px-4 py-3 rounded-xl flex items-start gap-3 text-xs font-medium ${
            result.type === "error"
              ? "bg-error/10 border border-error/20 text-error"
              : "bg-secondary/10 border border-secondary/30 text-primary"
          }`}
        >
          <span className="material-symbols-outlined shrink-0 mt-0.5 text-base">
            {result.type === "error" ? "error" : "check_circle"}
          </span>
          <p className="flex-1">{result.message}</p>
          <button onClick={() => setResult({ type: null, message: null })} className="opacity-60 hover:opacity-100">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/15 shadow-xs">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">Total Banners</p>
          <p className="text-2xl font-bold text-primary font-headline mt-1">{total}</p>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/15 shadow-xs">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">Live (Visible)</p>
          <p className="text-2xl font-bold text-secondary font-headline mt-1">{activeCount}</p>
        </div>
      </div>

      {/* Banners */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/20 bg-surface-container-low/50">
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">Preview</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">Title</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">Link Target</th>
                {/* <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">Order</th> */}
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">Status</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {banners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-on-surface-variant/40 mb-1">
                        <span className="material-symbols-outlined text-2xl">view_carousel</span>
                      </div>
                      <p className="text-sm font-bold text-primary font-headline">No banners yet</p>
                      <p className="text-xs opacity-60">Click &apos;Create New Banner&apos; to add your first carousel slide.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                banners.map((banner) => (
                  <tr key={banner.id} className="hover:bg-surface-container-low/30 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="w-32 md:w-40 aspect-video rounded-lg overflow-hidden border border-outline-variant/15 bg-surface-container shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={banner.image_url}
                          alt={banner.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/assets/hero_cleaning_1773410829223.png";
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-bold text-primary text-xs truncate max-w-44" title={banner.title}>
                        {banner.title}
                      </p>
                      <p className="text-[10px] text-on-surface-variant/70 mt-0.5">{banner.created_at ? new Date(banner.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {banner.link_url ? (
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-on-surface-variant max-w-56 truncate" title={banner.link_url}>
                          <span className={`material-symbols-outlined text-sm shrink-0 ${banner.link_url.startsWith("/") ? "text-primary" : "text-secondary"}`}>
                            {banner.link_url.startsWith("/") ? "chevron_right" : "open_in_new"}
                          </span>
                          {banner.link_url}
                        </span>
                      ) : (
                        <span className="text-[11px] text-on-surface-variant/50 italic">No link (not clickable)</span>
                      )}
                    </td>
                    {/* <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onReorder(banner, "up")}
                          disabled={isPending || i === 0}
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          <span className="material-symbols-outlined text-sm">arrow_upward</span>
                        </button>
                        <span className="text-xs font-bold text-on-surface-variant tabular-nums w-6 text-center">{banner.sort_order}</span>
                        <button
                          onClick={() => onReorder(banner, "down")}
                          disabled={isPending || i === banners.length - 1}
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          <span className="material-symbols-outlined text-sm">arrow_downward</span>
                        </button>
                      </div>
                    </td> */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={banner.is_active ? "success" : "outline"} className="text-[9px] px-2 py-0.5">
                        {banner.is_active ? "Live" : "Hidden"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onToggle(banner)}
                          disabled={isPending}
                          className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
                            banner.is_active ? "bg-secondary" : "bg-surface-container-highest"
                          }`}
                          title={banner.is_active ? "Hide from dashboard" : "Show on dashboard"}
                        >
                          <span
                            className={`inline-block w-4 h-4 transform rounded-full bg-white transition-transform shadow ${
                              banner.is_active ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                        <Link
                          href={`/admin/banners/${banner.id}/edit`}
                          className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all flex items-center justify-center"
                          title="Edit Banner"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </Link>
                        <button
                          onClick={() => setConfirmDeleteId(banner.id)}
                          disabled={isPending}
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                          title="Delete banner"
                        >
                          <span className="material-symbols-outlined text-sm">delete_forever</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/20 p-6 max-w-sm w-full animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center gap-3 text-error">
              <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">warning</span>
              </div>
              <h3 className="text-lg font-bold text-primary font-headline">Delete banner?</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              This banner will be removed from the carousel immediately. This cannot be undone.
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