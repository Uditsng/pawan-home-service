"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { ensureServicesBucketAction } from "@/app/admin/actions";

interface NotificationImageUploadFieldProps {
  name?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export function NotificationImageUploadField({
  name = "image_url",
  defaultValue = "",
  onValueChange,
}: NotificationImageUploadFieldProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");
  const [imageUrl, setImageUrl] = useState<string>(defaultValue);
  const [previewUrl, setPreviewUrl] = useState<string>(defaultValue);
  const [uploadState, setUploadState] = useState<"idle" | "compressing" | "uploading" | "success" | "error">("idle");
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [imageMeta, setImageMeta] = useState<{
    width?: number;
    height?: number;
    sizeKb?: number;
    format?: string;
    originalSizeKb?: number;
  }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (defaultValue) {
      if (defaultValue.startsWith("/assets/")) {
        setActiveTab("upload");
      } else {
        setActiveTab("url");
      }
      validateImageUrl(defaultValue);
    }
  }, [defaultValue]);

  const updateUrl = (url: string) => {
    setImageUrl(url);
    if (onValueChange) {
      onValueChange(url);
    }
  };

  const validateImageUrl = (url: string) => {
    if (!url) {
      setPreviewUrl("");
      setValidationWarnings([]);
      setImageMeta({});
      return;
    }

    setPreviewUrl(url);
    setValidationWarnings([]);

    const img = new Image();
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      const isCorrectRatio = Math.abs((w / h) - 2) <= 0.2;
      const warnings: string[] = [];

      if (!isCorrectRatio) {
        warnings.push(`Aspect ratio is not 2:1 landscape (${w}x${h}). The image might be cropped or stretched on user devices.`);
      }
      if (w < 800) {
        warnings.push(`Resolution is low (${w}x${h}). High-resolution notification banners prefer 1024px width minimum.`);
      }

      setImageMeta(prev => ({
        ...prev,
        width: w,
        height: h,
        format: url.endsWith(".webp") || url.includes(".webp") ? "WebP" : url.endsWith(".png") ? "PNG" : "JPG/JPEG",
      }));

      if (url.startsWith("http")) {
        fetch(url, { method: "HEAD" })
          .then((res) => {
            const contentLength = res.headers.get("Content-Length");
            if (contentLength) {
              const kb = Math.round(parseInt(contentLength) / 1024);
              setImageMeta(prev => ({ ...prev, sizeKb: kb }));
              if (kb > 300) {
                setValidationWarnings(prev => [
                  ...prev,
                  `File size is ${kb} KB, which exceeds recommended 300 KB limit for rapid mobile delivery.`,
                ]);
              }
            }
          })
          .catch(() => {});
      }

      setValidationWarnings(prev => [...prev, ...warnings]);
    };

    img.onerror = () => {
      setValidationWarnings(["The image URL is invalid or inaccessible. Ensure the link points directly to a valid image file."]);
      setImageMeta({});
    };

    img.src = url;
  };

  const resizeAndCompressImage = (file: File): Promise<{ blob: Blob; originalSize: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          
          // Enforce 1024x512 standard landscape ratio
          canvas.width = 1024;
          canvas.height = 512;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Failed to get 2D canvas context."));
            return;
          }

          let sWidth = img.width;
          let sHeight = img.height;
          let sx = 0;
          let sy = 0;

          if (img.width / img.height > 2) {
            sWidth = img.height * 2;
            sx = (img.width - sWidth) / 2;
          } else {
            sHeight = img.width / 2;
            sy = (img.height - sHeight) / 2;
          }

          ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, 1024, 512);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({ blob, originalSize: file.size });
              } else {
                reject(new Error("Canvas to webp blob conversion failed."));
              }
            },
            "image/webp",
            0.82
          );
        };
        img.onerror = () => reject(new Error("Failed to decode image file."));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file contents."));
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadState("compressing");
    setValidationWarnings([]);
    setImageMeta({});

    try {
      await ensureServicesBucketAction();

      const { blob, originalSize } = await resizeAndCompressImage(file);
      const originalKb = Math.round(originalSize / 1024);
      const compressedKb = Math.round(blob.size / 1024);

      setUploadState("uploading");

      const timestamp = Date.now();
      const cleanName = file.name
        .toLowerCase()
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      const fileName = `notifications/${cleanName}-${timestamp}.webp`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("services")
        .upload(fileName, blob, {
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: { publicUrl } } = supabase.storage
        .from("services")
        .getPublicUrl(fileName);

      updateUrl(publicUrl);
      setPreviewUrl(publicUrl);
      setUploadState("success");
      setImageMeta({
        width: 1024,
        height: 512,
        sizeKb: compressedKb,
        originalSizeKb: originalKb,
        format: "WebP (Auto-optimized)",
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error(err);
      setUploadState("error");
      setValidationWarnings([`Compression/Upload failed: ${(err as Error).message}`]);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    updateUrl(val);
    validateImageUrl(val);
  };

  const handleRemoveImage = () => {
    updateUrl("");
    setPreviewUrl("");
    setImageMeta({});
    setValidationWarnings([]);
    setUploadState("idle");
  };

  return (
    <div className="bg-surface-container-low p-4 sm:p-5 rounded-2xl border border-outline-variant/10 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/10 pb-3">
        <div>
          <h3 className="text-sm font-bold text-primary font-headline">Notification Banner Image</h3>
          <p className="text-[10px] text-on-surface-variant/70 mt-0.5">Define or upload the image banner displayed inside push alerts (landscape layout).</p>
        </div>
        <div className="flex bg-surface-container rounded-lg p-0.5 border border-outline-variant/10 w-max shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all select-none cursor-pointer ${
              activeTab === "upload"
                ? "bg-primary text-white shadow-xs"
                : "text-on-surface-variant/80 hover:text-primary"
            }`}
          >
            Upload Banner
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all select-none cursor-pointer ${
              activeTab === "url"
                ? "bg-primary text-white shadow-xs"
                : "text-on-surface-variant/80 hover:text-primary"
            }`}
          >
            Pasted URL
          </button>
        </div>
      </div>

      <input type="hidden" name={name} value={imageUrl} />

      {activeTab === "upload" ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadState === "compressing" || uploadState === "uploading"}
              className="px-4 py-2.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#0F172A] active:scale-95 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-[14px]">cloud_upload</span>
              Choose Local Image
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
            />
            {imageUrl && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="px-3 py-2 border border-outline-variant/30 text-on-surface-variant hover:text-error text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-error/5 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
                Clear
              </button>
            )}
          </div>
          {uploadState === "compressing" && (
            <p className="text-xs text-secondary font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
              Optimizing banner (cropping 2:1 landscape, WebP)...
            </p>
          )}
          {uploadState === "uploading" && (
            <p className="text-xs text-primary font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
              Uploading WebP to Supabase CDN...
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. https://ediguddeddmoxchhqcfn.supabase.co/storage/v1/object/public/services/notifications/image.webp"
              value={imageUrl}
              onChange={handleUrlChange}
              className="grow p-3 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
            />
            {imageUrl && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="px-3 bg-surface-container-high rounded-xl border border-outline-variant/20 text-on-surface-variant hover:text-error hover:bg-error/10 active:scale-95 transition-all"
                title="Clear input"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>
        </div>
      )}

      {validationWarnings.length > 0 && (
        <div className="bg-warning/10 border border-warning/20 text-warning px-4 py-3 rounded-xl flex items-start gap-3 animate-in fade-in duration-200">
          <span className="material-symbols-outlined shrink-0 mt-0.5 text-base">warning</span>
          <div className="flex-1 space-y-1">
            <p className="text-xs font-black uppercase tracking-wider leading-none">Guidance Warning</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {validationWarnings.map((warning, i) => (
                <li key={i} className="text-[11px] font-semibold leading-normal">{warning}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {previewUrl && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-surface rounded-2xl border border-outline-variant/25 p-4 items-center">
          <div className="md:col-span-1 flex justify-center">
            <div className="relative w-full aspect-2/1 bg-surface-container-low rounded-xl overflow-hidden border border-outline-variant/20 shadow-xs flex items-center justify-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Banner Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/assets/hero_cleaning_1773410829223.png";
                }}
              />
            </div>
          </div>

          <div className="md:col-span-2 space-y-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Banner Attributes</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <div>
                <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase block">Resolution</span>
                <span className="text-[11px] font-bold text-primary">
                  {imageMeta.width && imageMeta.height ? `${imageMeta.width} × ${imageMeta.height} px` : "Analyzing..."}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase block">Format</span>
                <span className="text-[11px] font-bold text-primary">{imageMeta.format || "Analyzing..."}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase block">File Size</span>
                <span className="text-[11px] font-bold text-primary">
                  {imageMeta.sizeKb ? `${imageMeta.sizeKb} KB` : "Analyzing..."}
                </span>
              </div>
              {imageMeta.originalSizeKb && (
                <div>
                  <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase block">Compression</span>
                  <span className="text-[11px] font-bold text-secondary">
                    {Math.round((1 - (imageMeta.sizeKb || 0) / imageMeta.originalSizeKb) * 100)}% smaller
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-surface p-4 rounded-xl border border-outline-variant/15 text-xs text-on-surface-variant/90 space-y-2.5">
        <h4 className="font-bold text-primary text-xs flex items-center gap-1.5 font-headline">
          <span className="material-symbols-outlined text-secondary text-sm">info</span>
          PHS Banner Image Guidelines
        </h4>
        <div className="grid grid-cols-2 gap-2 text-[11px] font-medium leading-relaxed">
          <div className="flex gap-1.5 items-start">
            <span className="material-symbols-outlined text-[14px] text-secondary mt-0.5">check_circle</span>
            <span><strong>Aspect Ratio:</strong> 2:1 (Landscape aspect ratio)</span>
          </div>
          <div className="flex gap-1.5 items-start">
            <span className="material-symbols-outlined text-[14px] text-secondary mt-0.5">check_circle</span>
            <span><strong>Dimensions:</strong> 1024 x 512 px standard</span>
          </div>
          <div className="flex gap-1.5 items-start">
            <span className="material-symbols-outlined text-[14px] text-secondary mt-0.5">check_circle</span>
            <span><strong>Preferred Format:</strong> WebP (Fast load time)</span>
          </div>
          <div className="flex gap-1.5 items-start">
            <span className="material-symbols-outlined text-[14px] text-secondary mt-0.5">check_circle</span>
            <span><strong>Optimal File Size:</strong> Under 300 KB</span>
          </div>
        </div>
      </div>
    </div>
  );
}
