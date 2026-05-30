import type { DeckMetadataInput, SlideManifest } from "./manifest.js";

export type OgpEntry = {
  title: string;
  description?: string;
  image?: string;
};

export type OgpMetadata = {
  deck: OgpEntry;
  slides: Record<string, OgpEntry>;
};

export function buildOgpMetadata(input: {
  manifest: SlideManifest;
  metadata: DeckMetadataInput;
  defaultImage?: string;
}) {
  const deckDescription =
    input.metadata.description || `${input.manifest.title} - ${input.manifest.slides.length} slides`;
  const deckImage = input.metadata.defaultOgImage || input.manifest.ogImage || input.defaultImage;

  return {
    deck: {
      title: input.metadata.title,
      description: deckDescription,
      image: deckImage
    },
    slides: Object.fromEntries(
      input.manifest.slides.map((slide) => [
        slide.orderText,
        {
          title: slide.title,
          description: input.metadata.description || `${input.metadata.title} - ${slide.title}`,
          image: deckImage
        }
      ])
    )
  };
}

export function renderOgpHtml(input: {
  entry: OgpEntry;
  url: string;
  appHtml: string;
  defaultTitle: string;
}) {
  const title = input.entry.title || input.defaultTitle;
  const description = input.entry.description || title;
  const image = input.entry.image;
  const meta = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${escapeHtml(input.url)}">`,
    image ? `<meta property="og:image" content="${escapeHtml(image)}">` : "",
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
    image ? `<meta name="twitter:image" content="${escapeHtml(image)}">` : ""
  ]
    .filter(Boolean)
    .join("\n    ");

  if (input.appHtml.includes("</head>")) {
    return input.appHtml.replace("</head>", `    ${meta}\n  </head>`);
  }

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${meta}
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
}

export function selectOgpEntry(metadata: OgpMetadata, slideParam?: string) {
  if (!slideParam) {
    return metadata.deck;
  }

  return metadata.slides[slideParam] || metadata.slides[String(Number(slideParam)).padStart(2, "0")] || metadata.deck;
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
