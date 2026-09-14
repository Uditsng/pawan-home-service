"use client";

import { useState } from "react";
import { ImageUploadField } from "@/components/ui/ImageUploadField";

interface GalleryUploadFieldProps {
  name?: string;
  defaultValue?: string[];
  onValueChange?: (images: string[]) => void;
  title?: string;
  description?: string;
  aspect?: number;
  aspectLabel?: string;
  outputWidth?: number;
  outputHeight?: number;
  fileNameSuffix?: string;
}

let gallerySlotId = 0;

function nextSlotId(): string {
  gallerySlotId += 1;
  return `slot-${gallerySlotId}`;
}

export function GalleryUploadField({
  name = "image_urls",
  defaultValue = [],
  onValueChange,
  title = "Service Images",
  description = "Add multiple showcase images. The first image is the cover card image; all images auto-slide on the service detail page.",
  aspect,
  aspectLabel,
  outputWidth,
  outputHeight,
  fileNameSuffix = "gallery",
}: GalleryUploadFieldProps) {
  const [slots, setSlots] = useState<{ id: string; url: string }[]>(() => {
    const initial = (defaultValue || []).filter((u) => Boolean(u && u.trim()));
    const result = initial.map((url) => ({ id: nextSlotId(), url }));
    if (result.length === 0) result.push({ id: nextSlotId(), url: "" });
    return result;
  });

  const commit = (next: { id: string; url: string }[]) => {
    setSlots(next);
    const urls = next.map((s) => s.url).filter((u) => Boolean(u && u.trim()));
    onValueChange?.(urls);
  };

  const updateSlot = (id: string, url: string) => {
    commit(slots.map((s) => (s.id === id ? { ...s, url } : s)));
  };

  const removeSlot = (id: string) => {
    const next = slots.filter((s) => s.id !== id);
    if (next.length === 0) next.push({ id: nextSlotId(), url: "" });
    commit(next);
  };

  const addSlot = () => {
    commit([...slots, { id: nextSlotId(), url: "" }]);
  };

  const imageUrls = slots.map((s) => s.url).filter((u) => Boolean(u && u.trim()));

  return (
    <div className="rounded-2xl">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-primary font-headline">{title}</h3>
        <p className="text-[10px] text-on-surface-variant/70 mt-0.5">{description}</p>
      </div>

      {/* Single JSON value submitted in the form */}
      <input type="hidden" name={name} value={JSON.stringify(imageUrls)} />

      <div className="space-y-3">
        {slots.map((slot, index) => (
          <div key={slot.id} className="relative">
            {slots.length > 1 && (
              <button
                type="button"
                onClick={() => removeSlot(slot.id)}
                aria-label={`Remove image ${index + 1}`}
                className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/30 shadow-md flex items-center justify-center hover:bg-error hover:text-white hover:border-error/40 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
            <ImageUploadField
              name={`__gallery_slot_${index}`}
              defaultValue={slot.url}
              onValueChange={(url) => updateSlot(slot.id, url)}
              title={`Image ${index + 1}${index === 0 ? " (Cover)" : ""}`}
              description="Recommended 16:9 landscape. Cropped to a fixed 1280×720 WebP on upload."
              aspect={aspect}
              aspectLabel={aspectLabel}
              outputWidth={outputWidth}
              outputHeight={outputHeight}
              fileNameSuffix={fileNameSuffix}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addSlot}
        className="mt-3 w-full flex items-center justify-center gap-2 py-3 bg-surface-container-low border border-dashed border-outline-variant/40 rounded-2xl text-xs font-black uppercase tracking-widest text-on-surface-variant hover:text-primary hover:border-primary/40 hover:bg-surface-container transition-all cursor-pointer"
      >
        <span className="material-symbols-outlined text-base">add_photo_alternate</span>
        Add image
      </button>
    </div>
  );
}