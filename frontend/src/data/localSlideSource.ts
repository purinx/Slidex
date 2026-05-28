import type { SlideManifest } from "../domain/slideManifest";

export async function fetchLocalSlides(deckId?: string): Promise<SlideManifest> {
  const resolvedDeckId = deckId || import.meta.env.VITE_DEFAULT_DECK_ID || "slidex";
  const response = await fetch(`/__slides/${encodeURIComponent(resolvedDeckId)}`, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error("Failed to load local slide list.");
  }

  return (await response.json()) as SlideManifest;
}
