import type { RemoteManifest, Slide, SlideWarning } from "./slideManifest";

export type ParsedSlideFile = {
  order: number;
  orderText: string;
  title: string;
  fileName: string;
};

const SLIDE_FILE_PATTERN = /^(\d{2,})__(.+)\.html$/;

export function parseSlideFileName(fileName: string): ParsedSlideFile | null {
  const baseName = fileName.split("/").pop() ?? fileName;

  if (baseName === "index.html") {
    return null;
  }

  const match = SLIDE_FILE_PATTERN.exec(baseName);

  if (!match) {
    return null;
  }

  const [, orderText, rawTitle] = match;
  return {
    order: Number(orderText),
    orderText,
    title: decodeTitle(rawTitle),
    fileName
  };
}

export function buildSlidesFromFileNames(
  fileNames: string[],
  resolveUrl: (fileName: string) => string
): { slides: Slide[]; warnings: SlideWarning[] } {
  const warnings: SlideWarning[] = [];
  const seenOrders = new Map<number, string>();
  const slides: Slide[] = [];

  for (const fileName of fileNames) {
    const parsed = parseSlideFileName(fileName);

    if (!parsed) {
      if (fileName.endsWith(".html") && fileName !== "index.html") {
        warnings.push({
          code: "invalid-slide-file-name",
          message: `${fileName} does not match NN__title.html.`,
          fileName
        });
      }
      continue;
    }

    const duplicated = seenOrders.get(parsed.order);
    if (duplicated) {
      warnings.push({
        code: "duplicate-slide-order",
        message: `${parsed.orderText} is duplicated by ${duplicated} and ${fileName}.`,
        fileName
      });
      continue;
    }

    seenOrders.set(parsed.order, fileName);
    slides.push({
      ...parsed,
      url: resolveUrl(fileName)
    });
  }

  return {
    slides: slides.sort((a, b) => a.order - b.order),
    warnings
  };
}

export function normalizeRemoteManifest(
  manifest: RemoteManifest,
  source: "api" | "s3",
  resolveUrl: (fileName: string, url?: string) => string
) {
  const warnings = [...(manifest.warnings ?? [])];
  const slides: Slide[] = [];
  const seenOrders = new Set<number>();

  for (const entry of manifest.slides ?? []) {
    const parsed = parseSlideFileName(entry.fileName);
    const order = entry.order ?? parsed?.order;
    const orderText = parsed?.orderText ?? String(order ?? "").padStart(2, "0");
    const title = entry.title ?? parsed?.title;

    if (!order || !title) {
      warnings.push({
        code: "invalid-manifest-slide",
        message: `${entry.fileName} is missing a valid order or title.`,
        fileName: entry.fileName
      });
      continue;
    }

    if (seenOrders.has(order)) {
      warnings.push({
        code: "duplicate-slide-order",
        message: `${orderText} is duplicated in manifest.`,
        fileName: entry.fileName
      });
      continue;
    }

    seenOrders.add(order);
    slides.push({
      order,
      orderText,
      title,
      fileName: entry.fileName,
      url: resolveUrl(entry.fileName, entry.url),
      ogImage: entry.ogImage
    });
  }

  return {
    deckId: manifest.deckId,
    title: manifest.title || "SlideX Deck",
    description: manifest.description,
    ogImage: manifest.ogImage,
    slides: slides.sort((a, b) => a.order - b.order),
    warnings,
    source
  };
}

function decodeTitle(rawTitle: string) {
  try {
    return decodeURIComponent(rawTitle);
  } catch {
    return rawTitle;
  }
}
