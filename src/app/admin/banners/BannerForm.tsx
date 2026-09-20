"use client";

import { useState, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import type { BannerFormState } from "./actions";

export interface BannerRow {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface BannerFormProps {
  action: (prevState: BannerFormState, formData: FormData) => Promise<BannerFormState>;
  banner?: BannerRow | null;
  isEdit?: boolean;
}

const fieldClass =
  "w-full px-3.5 py-2.5 bg-surface-container rounded-xl border border-outline-variant/20 text-xs font-medium text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all disabled:opacity-60 disabled:bg-surface-container-low";
const labelClass = "block text-[11px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5";

export function BannerForm({ action, banner, isEdit }: BannerFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, { type: null, message: null });
  const [imageUrl, setImageUrl] = useState<string>(banner?.image_url ?? "");
  const [linkUrl, setLinkUrl] = useState<string>(banner?.link_url ?? "");
  const [isActive, setIsActive] = useState<boolean>(banner?.is_active ?? true);

  useEffect(() => {
    if (state.type === "success") {
      router.replace("/admin/banners");
    }
  }, [state.type, router]);

  const isInternal = linkUrl.startsWith("/");

  return (
    <form action={formAction} className="space-y-6 max-w-4xl">
      {isEdit && banner && <input type="hidden" name="banner_id" value={banner.id} />}

      {state.type === "error" && (
        <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl flex items-start gap-3">
          <span className="material-symbols-outlined shrink-0 mt-0.5 text-lg">error</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">Something Went Wrong</p>
            <p className="text-xs mt-0.5 font-medium">{state.message}</p>
          </div>
        </div>
      )}

      {/* ─── 1. CAROUSEL IMAGE ────────────────────────────────── */}
      <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-outline-variant/15 pb-3">
          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-[#059669] shrink-0">
            <span className="material-symbols-outlined text-base">image</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary font-headline">Carousel Image</h3>
            <p className="text-[11px] text-on-surface-variant opacity-70">
              Upload the banner art. Cropped to a fixed 1280×720 WebP using the same pipeline as service images.
            </p>
          </div>
        </div>

        <div className="pt-1">
          <ImageUploadField
            name="image_url"
            defaultValue={banner?.image_url ?? ""}
            onValueChange={(url) => setImageUrl(url)}
            title="Banner Image"
            description="16:9 landscape banner shown in the carousel (aspect ratio matches the dashboard preview)."
            aspect={16 / 9}
            aspectLabel="16:9"
            outputWidth={1280}
            outputHeight={720}
            fileNameSuffix="banner"
            uploadOnly
          />
        </div>
      </div>

      {/* ─── 2. LINK & LABEL ─────────────────────────────────── */}
      <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-outline-variant/15 pb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-base">link</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary font-headline">Banner Link & Label</h3>
            <p className="text-[11px] text-on-surface-variant opacity-70">
              What the banner opens when customers tap it, plus the alt label.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div>
            <label className={labelClass} htmlFor="link_url">
              Custom Link URL
            </label>
            <input
              id="link_url"
              name="link_url"
              type="text"
              placeholder="e.g. /customer/services/cleaning or https://example.com/promo"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className={fieldClass}
            />
            <p className="text-[11px] text-on-surface-variant opacity-60 mt-1">
              Anything the customer should land on when they tap the banner — an internal page or an external website.
            </p>
            {linkUrl && (
              <span
                className={`inline-flex items-center gap-1 mt-1.5 text-[10px] font-black uppercase tracking-widest ${
                  isInternal || linkUrl.startsWith("http://") || linkUrl.startsWith("https://")
                    ? "text-secondary"
                    : "text-error"
                }`}
              >
                <span className="material-symbols-outlined text-sm">info</span>
                {isInternal
                  ? "Internal route"
                  : linkUrl.startsWith("http://") || linkUrl.startsWith("https://")
                    ? "External URL"
                    : "Invalid — must start with / or http(s)"}
              </span>
            )}
          </div>
          <div>
            <label className={labelClass} htmlFor="title">
              Banner Title <span className="text-error">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="e.g. Monsoon Pest Control Offer"
              defaultValue={banner?.title ?? ""}
              className={fieldClass}
            />
            <p className="text-[11px] text-on-surface-variant opacity-60 mt-1">
              Used as the alt text for the image.
            </p>
          </div>
        </div>
      </div>

      {/* ─── 3. PLACEMENT ────────────────────────────────────── */}
      <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-outline-variant/15 pb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-base">tune</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary font-headline">Placement & Visibility</h3>
            <p className="text-[11px] text-on-surface-variant opacity-70">
              Where the banner sits in the carousel and whether customers can see it.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div>
            <label className={labelClass} htmlFor="sort_order">
              Sort Order
            </label>
            <input
              id="sort_order"
              name="sort_order"
              type="number"
              min="0"
              defaultValue={banner?.sort_order ?? 0}
              className={fieldClass}
            />
            <p className="text-[11px] text-on-surface-variant opacity-60 mt-1">
              Lower numbers appear first. Use the up/down arrows on the list to reorder.
            </p>
          </div>
          <div>
            <label className={labelClass}>Live on Dashboard</label>
            <label className="flex items-center gap-2.5 px-3.5 py-2.5 bg-surface-container rounded-xl border border-outline-variant/15 cursor-pointer select-none">
              <input
                type="checkbox"
                name="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="accent-primary w-4 h-4"
              />
              <span className="text-xs font-semibold text-on-surface">
                {isActive ? "Visible to all customers" : "Hidden (only admins can see it)"}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* ─── 4. PREVIEW ──────────────────────────────────────── */}
      {imageUrl && (
        <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 border-b border-outline-variant/15 pb-3">
            <div className="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center text-secondary shrink-0">
              <span className="material-symbols-outlined text-base">visibility</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-primary font-headline">Live Preview</h3>
              <p className="text-[11px] text-on-surface-variant opacity-70">How the banner appears in the dashboard carousel.</p>
            </div>
          </div>
          <div className="pt-1 max-w-3xl aspect-video rounded-2xl overflow-hidden border border-outline-variant/25 shadow-sm relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={banner?.title ?? "Banner preview"}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/assets/hero_cleaning_1773410829223.png";
              }}
            />
            {!isActive && (
              <span className="absolute top-3 left-3 rounded-full bg-primary/80 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 backdrop-blur-md">
                Hidden
              </span>
            )}
          </div>
          {linkUrl && (
            <p className="text-[11px] font-semibold text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-secondary">open_in_new</span>
              Opens: <span className="font-mono text-primary">{linkUrl}</span>
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-primary text-white rounded-xl px-6 py-3 font-bold text-xs uppercase tracking-widest shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {isPending && <span className="material-symbols-outlined animate-spin text-sm mr-1.5">progress_activity</span>}
          {isEdit ? "Save Changes" : "Create Banner"}
        </Button>
        <Link href="/admin/banners">
          <Button
            type="button"
            variant="outline"
            size="md"
            className="rounded-xl px-6 py-3 border-outline-variant/30 text-on-surface-variant hover:bg-surface-container font-bold text-xs uppercase tracking-widest transition-all"
          >
            Cancel
          </Button>
        </Link>
      </div>
    </form>
  );
}