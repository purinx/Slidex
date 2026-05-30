import type { NormalizedUploadFile } from "./uploadValidation.js";
import { objectKey, encodePath } from "./paths.js";
import { parseSlideFileName } from "./slideFile.js";
import { DECK_OG_IMAGE_PATH } from "./ogImage.js";

export type DeckMetadataInput = {
  title: string;
  description?: string;
  defaultOgImage?: string;
};

export type DeckMetadata = DeckMetadataInput & {
  deckId: string;
  createdAt: string;
  updatedAt: string;
};

export type Slide = {
  order: number;
  orderText: string;
  title: string;
  fileName: string;
  key: string;
  url: string;
  ogImage?: string;
};

export type SlideManifest = {
  deckId: string;
  title: string;
  description?: string;
  ogImage?: string;
  slides: Slide[];
};

export function buildDeckMetadata(deckId: string, metadata: DeckMetadataInput, now = new Date()) {
  const timestamp = now.toISOString();
  return {
    deckId,
    title: metadata.title,
    description: metadata.description,
    defaultOgImage: metadata.defaultOgImage,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function buildManifest(input: {
  deckId: string;
  files: NormalizedUploadFile[];
  metadata: DeckMetadataInput;
  slidesPrefix: string;
}) {
  const slides = input.files
    .filter((file) => file.extension === ".html")
    .map((file) => {
      const parsed = parseSlideFileName(file.path);
      if (!parsed) {
        throw new Error(`Unexpected invalid slide path: ${file.path}`);
      }

      return {
        order: parsed.order,
        orderText: parsed.orderText,
        title: parsed.title,
        fileName: file.path,
        key: objectKey(input.slidesPrefix, input.deckId, file.path),
        url: `/api/decks/${encodeURIComponent(input.deckId)}/files/${encodePath(file.path)}`
      };
    })
    .sort((a, b) => a.order - b.order);

  return {
    deckId: input.deckId,
    title: input.metadata.title,
    description: input.metadata.description,
    ogImage: `/api/decks/${encodeURIComponent(input.deckId)}/files/${encodePath(DECK_OG_IMAGE_PATH)}`,
    slides
  };
}
