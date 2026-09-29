"use client";

import { useCallback, useState } from "react";

export type ImageFallbackStage = "transformed" | "original" | "none";

/**
 * Graceful degradation for Supabase-hosted service images.
 *
 * Supabase Storage image transformations (`/storage/v1/render/image/...`) return
 * HTTP 403 when the project has no image-transformation quota, and Next's image
 * optimizer refuses to proxy Supabase storage hosts at all. Listing cards
 * therefore load the public storage URL directly and walk down a fallback chain:
 *
 *   transformed -> original object -> icon / gradient
 *
 * so a quota problem degrades image size, never the layout.
 *
 * The stage is keyed to the requested URL, so changing the `imageUrl` prop
 * restarts the chain at "transformed" without a setState-inside-an-effect.
 */
export function useImageFallback(imageUrl: string | null | undefined) {
  const [state, setState] = useState<{ url: string | null; stage: ImageFallbackStage }>({
    url: null,
    stage: "none",
  });

  const requested = imageUrl ?? null;
  const isCurrent = state.url === requested;
  const stage: ImageFallbackStage = isCurrent
    ? state.stage
    : requested
      ? "transformed"
      : "none";

  const onError = useCallback(() => {
    setState((prev) => {
      const prevStage =
        prev.url === requested ? prev.stage : requested ? "transformed" : "none";
      return {
        url: requested,
        stage: prevStage === "transformed" ? "original" : "none",
      };
    });
  }, [requested]);

  return { stage, onError };
}
