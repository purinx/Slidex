import { fetchDeckManifest } from "./s3ManifestSlideSource";
import type { DeckSummary } from "../domain/slideManifest";

export async function fetchDeckList(): Promise<DeckSummary[]> {
  if (import.meta.env.DEV) {
    const response = await fetch("/__decks", {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error("Failed to load local deck list.");
    }

    const body = (await response.json()) as { decks?: DeckSummary[] };
    return body.decks ?? [];
  }

  const defaultDeckId = import.meta.env.VITE_DEFAULT_DECK_ID;
  if (!defaultDeckId) {
    return [];
  }

  const manifest = await fetchDeckManifest(defaultDeckId);
  return [
    {
      deckId: manifest.deckId || defaultDeckId,
      title: manifest.title,
      description: manifest.description,
      ogImage: manifest.ogImage,
      slideCount: manifest.slides.length,
      warnings: manifest.warnings
    }
  ];
}
