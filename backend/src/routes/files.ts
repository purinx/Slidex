import { Hono } from "hono";
import { validateDeckId } from "../domain/deckId.js";
import { badRequest } from "../domain/errors.js";
import { normalizeUploadPath, objectKey, encodePath } from "../domain/paths.js";
import type { Env } from "../infra/env.js";
import type { ObjectStorage } from "../infra/storage.js";

export function createFileRoutes(deps: { env: Env; storage: ObjectStorage }) {
  const app = new Hono();

  app.get("/:deckId/files/*", async (c) => {
    const deckId = validateDeckId(c.req.param("deckId"));
    const path = normalizeUploadPath(filePathFromRequestPath(c.req.path));
    const key = objectKey(deps.env.slidesPrefix, deckId, path);

    if (deps.env.s3PublicBaseUrl) {
      return c.redirect(`${deps.env.s3PublicBaseUrl}/${encodePath(key)}`, 302);
    }

    const url = await deps.storage.createSignedGetUrl({
      key,
      expiresInSeconds: 300
    });
    return c.redirect(url, 302);
  });

  return app;
}

function filePathFromRequestPath(requestPath: string) {
  const marker = "/files/";
  const markerIndex = requestPath.indexOf(marker);

  if (markerIndex === -1) {
    throw badRequest("INVALID_FILE_PATH", "File path must be a relative path.", { path: "" });
  }

  try {
    return decodeURIComponent(requestPath.slice(markerIndex + marker.length));
  } catch {
    throw badRequest("INVALID_FILE_PATH", "File path must be a relative path.", { path: "" });
  }
}
