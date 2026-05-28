import { Hono } from "hono";
import { createDeckId, validateDeckId } from "../domain/deckId.js";
import { badRequest, notFound, serverError } from "../domain/errors.js";
import { buildDeckMetadata, buildManifest, type DeckMetadataInput, type SlideManifest } from "../domain/manifest.js";
import { buildOgpMetadata } from "../domain/ogp.js";
import { objectKey } from "../domain/paths.js";
import { validateUploadFiles, type UploadFileDescriptor } from "../domain/uploadValidation.js";
import type { Env } from "../infra/env.js";
import type { ObjectStorage } from "../infra/storage.js";
import { requireAdminAuth } from "./auth.js";

export type DeckRouteDeps = {
  env: Env;
  storage: ObjectStorage;
};

export function createDeckRoutes(deps: DeckRouteDeps) {
  const app = new Hono();
  const admin = requireAdminAuth(deps.env);

  app.post("/", admin, async (c) => {
    const body = await readJson<CreateDeckBody>(c.req.raw);
    const title = requireString(body.title, "title");
    const deckId = body.deckId ? validateDeckId(body.deckId) : createDeckId(title);

    return c.json({
      deckId,
      uploadPrefix: `${deps.env.slidesPrefix.replace(/^\/+|\/+$/g, "")}/${deckId}/`
    });
  });

  app.post("/:deckId/uploads", admin, async (c) => {
    const deckId = validateDeckId(c.req.param("deckId"));
    const body = await readJson<{ files?: UploadFileDescriptor[] }>(c.req.raw);
    const files = validateUploadFiles(body.files ?? [], uploadLimits(deps.env));
    const expiresInSeconds = 900;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    const uploads = await Promise.all(
      files.map(async (file) => {
        const key = objectKey(deps.env.slidesPrefix, deckId, file.path);
        const url = await deps.storage.createSignedPutUrl({
          key,
          contentType: file.contentType,
          expiresInSeconds
        });

        return {
          path: file.path,
          key,
          url,
          expiresAt
        };
      })
    );

    return c.json({
      deckId,
      uploads,
      warnings: []
    });
  });

  app.post("/:deckId/complete", admin, async (c) => {
    const deckId = validateDeckId(c.req.param("deckId"));
    const body = await readJson<CompleteUploadBody>(c.req.raw);
    const metadata = validateMetadata(body.metadata);
    const files = validateUploadFiles(body.files ?? [], uploadLimits(deps.env));

    for (const file of files) {
      const key = objectKey(deps.env.slidesPrefix, deckId, file.path);
      let head;
      try {
        head = await deps.storage.headObject(key);
      } catch {
        throw notFound("S3_UPLOAD_NOT_FOUND", "Uploaded object was not found.", { path: file.path, key });
      }

      if (typeof head.contentLength === "number" && head.contentLength !== file.size) {
        throw badRequest("S3_UPLOAD_NOT_FOUND", "Uploaded object size does not match request metadata.", {
          path: file.path,
          key
        });
      }
    }

    const deckMetadata = buildDeckMetadata(deckId, metadata);
    const manifest = buildManifest({
      deckId,
      files,
      metadata,
      slidesPrefix: deps.env.slidesPrefix
    });
    const ogp = buildOgpMetadata({
      manifest,
      metadata,
      defaultImage: deps.env.ogpDefaultImageUrl
    });

    try {
      await Promise.all([
        putJson(deps, objectKey(deps.env.slidesPrefix, deckId, "deck.json"), deckMetadata),
        putJson(deps, objectKey(deps.env.slidesPrefix, deckId, "manifest.json"), manifest),
        putJson(deps, objectKey(deps.env.slidesPrefix, deckId, "ogp.json"), ogp)
      ]);
    } catch (error) {
      throw serverError("MANIFEST_GENERATION_FAILED", "Failed to write manifest metadata.", {
        cause: error instanceof Error ? error.message : String(error)
      });
    }

    return c.json({
      deckId,
      manifestUrl: `/api/decks/${encodeURIComponent(deckId)}/manifest`,
      deckUrl: `/deck/${encodeURIComponent(deckId)}`,
      slides: manifest.slides.length
    });
  });

  app.get("/:deckId/manifest", async (c) => {
    const deckId = validateDeckId(c.req.param("deckId"));
    const key = objectKey(deps.env.slidesPrefix, deckId, "manifest.json");
    const manifest = await getJson<SlideManifest>(deps, key, "MANIFEST_NOT_FOUND");
    return c.json(manifest);
  });

  return app;
}

type CreateDeckBody = {
  title?: string;
  description?: string;
  deckId?: string;
};

type CompleteUploadBody = {
  files?: UploadFileDescriptor[];
  metadata?: DeckMetadataInput;
};

function uploadLimits(env: Env) {
  return {
    maxFileSize: env.uploadMaxFileSize,
    maxDeckSize: env.uploadMaxDeckSize
  };
}

function validateMetadata(metadata?: DeckMetadataInput) {
  if (!metadata || typeof metadata !== "object") {
    throw badRequest("INVALID_METADATA", "metadata is required.");
  }

  const title = requireString(metadata.title, "metadata.title");
  return {
    title,
    description: optionalString(metadata.description, "metadata.description"),
    defaultOgImage: optionalString(metadata.defaultOgImage, "metadata.defaultOgImage")
  };
}

function requireString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw badRequest("INVALID_METADATA", `${field} is required.`);
  }

  return value.trim();
}

function optionalString(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw badRequest("INVALID_METADATA", `${field} must be a string.`);
  }

  return value.trim();
}

async function readJson<T>(request: Request) {
  try {
    return (await request.json()) as T;
  } catch {
    throw badRequest("INVALID_JSON", "Request body must be valid JSON.");
  }
}

async function putJson(deps: DeckRouteDeps, key: string, value: unknown) {
  await deps.storage.putObject({
    key,
    body: JSON.stringify(value, null, 2),
    contentType: "application/json; charset=utf-8"
  });
}

async function getJson<T>(deps: DeckRouteDeps, key: string, code: string) {
  try {
    return JSON.parse(await deps.storage.getObjectText(key)) as T;
  } catch {
    throw notFound(code, "Metadata object was not found.", { key });
  }
}
