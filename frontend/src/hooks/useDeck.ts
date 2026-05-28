import { useCallback, useEffect, useState } from "react";
import { fetchLocalSlides } from "../data/localSlideSource";
import { fetchDeckManifest } from "../data/s3ManifestSlideSource";
import type { SlideManifest } from "../domain/slideManifest";

export type LoadingState = "idle" | "loadingManifest" | "ready" | "error";

export function useDeck(deckId?: string) {
  const [deck, setDeck] = useState<SlideManifest>();
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [viewerError, setViewerError] = useState<string>();

  const loadDeck = useCallback(async () => {
    setLoadingState("loadingManifest");
    setViewerError(undefined);

    try {
      const manifest = import.meta.env.DEV
        ? await fetchLocalSlides(deckId)
        : await fetchDeckManifest(deckId);
      setDeck(manifest);
      setLoadingState("ready");
    } catch (error) {
      setViewerError(error instanceof Error ? error.message : "Failed to load deck.");
      setLoadingState("error");
    }
  }, [deckId]);

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
