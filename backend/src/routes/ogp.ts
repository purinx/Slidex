import { Hono } from "hono";
import { validateDeckId } from "../domain/deckId.js";
import { type OgpMetadata, renderOgpHtml, selectOgpEntry } from "../domain/ogp.js";
import { objectKey } from "../domain/paths.js";
import type { Env } from "../infra/env.js";
import type { ObjectStorage } from "../infra/storage.js";

export function createOgpRoutes(deps: { env: Env; storage: ObjectStorage; getAppHtml: () => Promise<string> }) {
  const app = new Hono();

  app.get("/:deckId", async (c) => {
    const deckId = validateDeckId(c.req.param("deckId"));
    const key = objectKey(deps.env.slidesPrefix, deckId, "ogp.json");
    let ogp: OgpMetadata | undefined;

    try {
      ogp = JSON.parse(await deps.storage.getObjectText(key)) as OgpMetadata;
    } catch {
      ogp = undefined;
    }

    const fallbackTitle = `SlideX - ${deckId}`;
    const entry = ogp
      ? selectOgpEntry(ogp, c.req.query("slide"))
      : {
          title: fallbackTitle,
          description: "SlideX deck",
          image: deps.env.ogpDefaultImageUrl
        };
    const html = renderOgpHtml({
      entry,
      url: c.req.url,
      appHtml: await deps.getAppHtml(),
      defaultTitle: fallbackTitle
    });

    return c.html(html);
  });

  return app;
}
