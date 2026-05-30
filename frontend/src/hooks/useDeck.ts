import { useCallback, useEffect, useState } from "react";
import { fetchLocalSlides } from "../data/localSlideSource";
import { fetchDeckManifest } from "../data/s3ManifestSlideSource";
import type { SlideManifest } from "../domain/slideManifest";

export type LoadingState = "idle" | "loadingManifest" | "ready" | "error";
type DeckSource = "auto" | "local" | "api";

export function useDeck(deckId?: string, options?: { enabled?: boolean; source?: DeckSource }) {
  const [deck, setDeck] = useState<SlideManifest>();
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [viewerError, setViewerError] = useState<string>();
  const enabled = options?.enabled ?? true;
  const source = options?.source ?? "auto";

  const loadDeck = useCallback(async () => {
    if (!enabled) {
      setDeck(undefined);
      setLoadingState("idle");
      setViewerError(undefined);
      return;
    }

    setLoadingState("loadingManifest");
    setViewerError(undefined);

    try {
      const manifest =
        source === "local" || (source === "auto" && import.meta.env.DEV)
          ? await fetchLocalSlides(deckId)
          : await fetchDeckManifest(deckId);
      setDeck(manifest);
      setLoadingState("ready");
    } catch (error) {
      setViewerError(error instanceof Error ? error.message : "Failed to load deck.");
      setLoadingState("error");
    }
  }, [deckId, enabled, source]);

  useEffect(() => {
    void loadDeck();
  }, [loadDeck]);

  return {
    deck,
    loadingState,
    viewerError,
    reload: loadDeck
  };
}
