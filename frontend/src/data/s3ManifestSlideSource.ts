import { apiFetch } from "./apiClient";
import { normalizeRemoteManifest } from "../domain/slideFile";
import type { RemoteManifest, SlideManifest } from "../domain/slideManifest";

export async function fetchDeckManifest(deckId?: string): Promise<SlideManifest> {
  const resolvedDeckId = deckId || import.meta.env.VITE_DEFAULT_DECK_ID;

  if (resolvedDeckId) {
    const manifest = await apiFetch<RemoteManifest>(
      `/api/decks/${encodeURIComponent(resolvedDeckId)}/manifest`
    );
    return normalizeRemoteManifest(manifest, "api", (_fileName, url) => url || "");
  }

  const publicBaseUrl = import.meta.env.VITE_S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (!publicBaseUrl) {
    throw new Error("No deck id or VITE_S3_PUBLIC_BASE_URL is configured.");
  }

  const response = await fetch(`${publicBaseUrl}/manifest.json`, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error("Failed to load public manifest.");
  }

  const manifest = (await response.json()) as RemoteManifest;
  return normalizeRemoteManifest(manifest, "s3", (fileName, url) =>
    url || `${publicBaseUrl}/${encodeURI(fileName)}`
  );
}
