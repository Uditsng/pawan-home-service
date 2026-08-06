"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.05;

interface Point {
  x: number;
  y: number;
}

interface ImageCropperProps {
  imageSrc: string;
  outputSize?: number;
  onCropComplete: (blob: Blob) => void;
  onCancel: () => void;
}

/**
 * Fixed-aspect (1:1) crop tool rendered as an overlay modal. The admin drags to
 * reposition and zooms (slider or mouse wheel) to choose the visible region.
 * On apply, the selected region is rendered to a fixed 1024x1024 (configurable)
 * WebP blob so every consumer sees the exact same frame with fixed dimensions.
 */
export function ImageCropper({
  imageSrc,
  outputSize = 1024,
  onCropComplete,
  onCancel,
}: ImageCropperProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [boxSize, setBoxSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const dragStart = useRef<{ pointer: Point; position: Point } | null>(null);
  const centeredRef = useRef(false);

  // Center the cover-fit image within the square viewport once dimensions are known.
  const centerImage = useCallback(() => {
    const img = imgRef.current;
    const box = boxRef.current;
    if (!img || !box || !img.naturalWidth || centeredRef.current) return;
    const rect = box.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const scale =
      Math.max(rect.width / img.naturalWidth, rect.height / img.naturalHeight) * MIN_ZOOM;
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    setPosition({ x: (rect.width - w) / 2, y: (rect.height - h) / 2 });
    centeredRef.current = true;
  }, []);

  // Measure the crop viewport so pan/zoom math matches rendered CSS pixels.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setBoxSize((prev) =>
        prev.width === rect.width && prev.height === rect.height
          ? prev
          : { width: rect.width, height: rect.height }
      );
      centerImage();
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [centerImage]);

  const handleImageLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    centerImage();
  };

  const coverScale = useCallback(() => {
    if (!naturalSize || !boxSize.width || !boxSize.height) return 1;
    return Math.max(
      boxSize.width / naturalSize.width,
      boxSize.height / naturalSize.height
    );
  }, [naturalSize, boxSize]);

  const drawSize = useCallback(() => {
    const scale = coverScale();
    return {
      width: (naturalSize?.width ?? 0) * scale * zoom,
      height: (naturalSize?.height ?? 0) * scale * zoom,
    };
  }, [coverScale, naturalSize, zoom]);

  const clampPosition = useCallback(
    (pos: Point): Point => {
      const { width: w, height: h } = drawSize();
      const minX = Math.min(0, boxSize.width - w);
      const maxX = Math.max(0, boxSize.width - w);
      const minY = Math.min(0, boxSize.height - h);
      const maxY = Math.max(0, boxSize.height - h);
      return {
        x: Math.min(maxX, Math.max(minX, pos.x)),
        y: Math.min(maxY, Math.max(minY, pos.y)),
      };
    },
    [drawSize, boxSize]
  );

  const applyZoom = useCallback(
    (next: number, anchorX: number, anchorY: number) => {
      const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
      if (!naturalSize || !boxSize.width) {
        setZoom(clamped);
        return;
      }
      const scale = coverScale();
      const cx = (anchorX - position.x) / (scale * zoom);
      const cy = (anchorY - position.y) / (scale * zoom);
      const nextScale = scale * clamped;
      setPosition(
        clampPosition({ x: anchorX - cx * nextScale, y: anchorY - cy * nextScale })
      );
      setZoom(clamped);
      centeredRef.current = true;
    },
    [naturalSize, boxSize, coverScale, position, zoom, clampPosition]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { pointer: { x: e.clientX, y: e.clientY }, position };
    centeredRef.current = true;
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.pointer.x;
    const dy = e.clientY - dragStart.current.pointer.y;
    setPosition(
      clampPosition({
        x: dragStart.current.position.x + dx,
        y: dragStart.current.position.y + dy,
      })
    );
  };

  const handlePointerUp = () => {
    dragStart.current = null;
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const anchorX = e.clientX - rect.left;
    const anchorY = e.clientY - rect.top;
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    applyZoom(zoom + delta, anchorX, anchorY);
  };

  const handleApply = () => {
    const img = imgRef.current;
    if (!img || !naturalSize || !boxSize.width) return;
    setIsProcessing(true);
    const scale = coverScale() * zoom;
    const sx = Math.max(0, (0 - position.x) / scale);
    const sy = Math.max(0, (0 - position.y) / scale);
    const sw = Math.min(naturalSize.width - sx, boxSize.width / scale);
    const sh = Math.min(naturalSize.height - sy, boxSize.height / scale);

    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsProcessing(false);
      return;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outputSize, outputSize);
    canvas.toBlob(
      (blob) => {
        setIsProcessing(false);
        if (blob) onCropComplete(blob);
      },
      "image/webp",
      0.82
    );
  };

  const size = drawSize();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/60 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest w-full max-w-md rounded-3xl border border-outline-variant/20 shadow-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-primary font-headline">Crop Service Image</h3>
            <p className="text-[10px] text-on-surface-variant/70 mt-0.5">
              Drag to reposition · scroll or slide to zoom. Output is fixed at 1:1 {outputSize}×{outputSize} px.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-error transition-all cursor-pointer"
            title="Cancel cropping"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div
          ref={boxRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          className={`relative w-full aspect-square overflow-hidden rounded-2xl bg-surface-dim border border-outline-variant/25 touch-none select-none cursor-grab ${
            isDragging ? "cursor-grabbing" : ""
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Crop source"
            draggable={false}
            onLoad={handleImageLoad}
            className="absolute max-w-none"
            style={{ width: size.width, height: size.height, left: position.x, top: position.y }}
          />
          <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="border border-white/30" />
            ))}
          </div>
          <div className="pointer-events-none absolute bottom-2 left-2 text-[9px] font-black uppercase tracking-wider bg-primary/70 text-white px-2 py-1 rounded-lg">
            1:1 · {outputSize}×{outputSize}
          </div>
        </div>

        <div className="flex items-center gap-3 px-1">
          <span className="material-symbols-outlined text-on-surface-variant text-lg shrink-0">remove</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) =>
              applyZoom(Number(e.target.value), boxSize.width / 2, boxSize.height / 2)
            }
            className="w-full accent-emerald-600 cursor-pointer"
            aria-label="Zoom"
          />
          <span className="material-symbols-outlined text-on-surface-variant text-lg shrink-0">add</span>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={() => applyZoom(MIN_ZOOM, boxSize.width / 2, boxSize.height / 2)}
            className="px-4 py-2.5 border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
          >
            Reset
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={isProcessing || !naturalSize}
              className="px-4 py-2.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 active:scale-95 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[14px]">crop</span>
              {isProcessing ? "Processing..." : "Apply Crop"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}