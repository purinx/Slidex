import fs from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import type { Connect, Plugin } from "vite";
import { DECK_OG_IMAGE_FILE_NAME, renderDeckOgImageSvg } from "../domain/ogImage";
import { buildSlidesFromFileNames } from "../domain/slideFile";

export function localSlidesPlugin(slidesRootDir: string, defaultDeckId = "slidex"): Plugin {
  const ogImageJobs = new Map<string, Promise<void>>();

  return {
    name: "slidex-local-slides",
    configureServer(server) {
      const root = server.config.root;
      const resolvedSlidesRootDir = path.resolve(root, slidesRootDir);
      const resolvedOgImageDir = path.resolve(root, ".slidex-og");

      server.httpServer?.once("listening", () => {
        void generateAllDeckOgImages({
          slidesRootDir: resolvedSlidesRootDir,
          ogImageDir: resolvedOgImageDir,
          defaultDeckId,
          ogImageJobs
        }).catch((error) => {
          console.warn(
            `[slidex-local-slides] Failed to generate local OGP images: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        });
      });

      server.middlewares.use("/__decks", async (_request, response) => {
        try {
          const deckIds = await listDeckIds(resolvedSlidesRootDir, defaultDeckId);
          const decks = await Promise.all(
            deckIds.map(async (deckId) => {
              const resolvedSlidesDir = resolveDeckDir(resolvedSlidesRootDir, deckId);
              const fileNames = await listFiles(resolvedSlidesDir);
              const { slides, warnings } = buildSlidesFromFileNames(
                fileNames,
                (fileName) => `/__slide-files/${encodeURIComponent(deckId)}/${encodePath(fileName)}`
              );
              await ensureDeckOgImages({
                ogImageDir: resolvedOgImageDir,
                deckId,
                slideCount: slides.length,
                ogImageJobs
              });

              return {
                deckId,
                title: deckTitleFromDirectoryName(deckId),
                ogImage: `/__og-images/${encodeURIComponent(deckId)}/${DECK_OG_IMAGE_FILE_NAME}`,
                slideCount: slides.length,
                warnings
              };
            })
          );

          response.statusCode = 200;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ source: "local", decks }));
        } catch (error) {
          response.statusCode = 500;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(
            JSON.stringify({
              code: "local-decks-unavailable",
              message: error instanceof Error ? error.message : "Failed to read local decks."
            })
          );
        }
      });

      server.middlewares.use("/__slides", async (request, response) => {
        try {
          const deckId = deckIdFromRequest(request, defaultDeckId);
          const resolvedSlidesDir = resolveDeckDir(resolvedSlidesRootDir, deckId);
          const fileNames = await listFiles(resolvedSlidesDir);
          const { slides, warnings } = buildSlidesFromFileNames(
            fileNames,
            (fileName) => `/__slide-files/${encodeURIComponent(deckId)}/${encodePath(fileName)}`
          );
          await ensureDeckOgImages({
            ogImageDir: resolvedOgImageDir,
            deckId,
            slideCount: slides.length,
            ogImageJobs
          });
          const deckTitle = deckTitleFromDirectoryName(deckId);

          response.statusCode = 200;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(
            JSON.stringify({
              deckId,
              title: deckTitle,
              ogImage: `/__og-images/${encodeURIComponent(deckId)}/${DECK_OG_IMAGE_FILE_NAME}`,
              source: "local",
              slides,
              warnings
            })
          );
        } catch (error) {
          response.statusCode = 500;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(
            JSON.stringify({
              code: "local-slides-unavailable",
              message: error instanceof Error ? error.message : "Failed to read slides directory."
            })
          );
        }
      });

      server.middlewares.use("/__slide-files", serveSlideFile(resolvedSlidesRootDir, defaultDeckId));
      server.middlewares.use("/__og-images", serveOgImage(resolvedOgImageDir, defaultDeckId));
    }
  };
}

function serveSlideFile(slidesRootDir: string, defaultDeckId: string): Connect.HandleFunction {
  return async (request: IncomingMessage, response: ServerResponse) => {
    try {
      const { deckId, relativePath } = slideFileRequest(request, defaultDeckId);
      const baseDir = resolveDeckDir(slidesRootDir, deckId);
      const absolutePath = path.resolve(baseDir, relativePath);

      if (!absolutePath.startsWith(baseDir + path.sep) && absolutePath !== baseDir) {
        response.statusCode = 403;
        response.end("Forbidden");
        return;
      }

      const data = await fs.readFile(absolutePath);
      response.statusCode = 200;
      response.setHeader("Content-Type", contentTypeFor(absolutePath));
      response.end(data);
    } catch {
      response.statusCode = 404;
      response.end("Not found");
    }
  };
}

function serveOgImage(ogImageDir: string, defaultDeckId: string): Connect.HandleFunction {
  return async (request: IncomingMessage, response: ServerResponse) => {
    try {
      const { deckId, relativePath } = slideFileRequestForMount(request, "__og-images", defaultDeckId);
      const baseDir = path.resolve(ogImageDir, deckId);
      const absolutePath = path.resolve(baseDir, relativePath);

      if (!absolutePath.startsWith(baseDir + path.sep) || path.extname(absolutePath) !== ".svg") {
        response.statusCode = 403;
        response.end("Forbidden");
        return;
      }

      const data = await fs.readFile(absolutePath);
      response.statusCode = 200;
      response.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
      response.setHeader("Cache-Control", "no-store");
      response.end(data);
    } catch {
      response.statusCode = 404;
      response.end("Not found");
    }
  };
}

function deckIdFromRequest(request: IncomingMessage, defaultDeckId: string) {
  const path = middlewarePath(request, "__slides");
  const deckId = decodeURIComponent(path.split("/")[0] || defaultDeckId);
  return validateDeckId(deckId);
}

function slideFileRequest(request: IncomingMessage, defaultDeckId: string) {
  return slideFileRequestForMount(request, "__slide-files", defaultDeckId);
}

function slideFileRequestForMount(request: IncomingMessage, mountPath: string, defaultDeckId: string) {
  const parts = middlewarePath(request, mountPath).split("/");
  const deckId = validateDeckId(decodeURIComponent(parts.shift() || defaultDeckId));
  const relativePath = decodeURIComponent(parts.join("/"));

  if (!relativePath) {
    throw new Error("Missing slide file path.");
  }

  return { deckId, relativePath };
}

function middlewarePath(request: IncomingMessage, mountPath: string) {
  const requestUrl = new URL(request.url || "/", "http://localhost");
  const requestPath = requestUrl.pathname.replace(/^\/+/, "");

  if (requestPath === mountPath) {
    return "";
  }

  if (requestPath.startsWith(`${mountPath}/`)) {
    return requestPath.slice(mountPath.length + 1);
  }

  return requestPath;
}

function validateDeckId(deckId: string) {
  if (!isValidLocalDeckId(deckId)) {
    throw new Error("Invalid local deck id.");
  }

  return deckId;
}

function isValidLocalDeckId(deckId: string) {
  return (
    deckId.length > 0 &&
    deckId.length <= 120 &&
    !deckId.includes("/") &&
    !deckId.includes("\\") &&
    deckId !== "." &&
    deckId !== ".."
  );
}

function resolveDeckDir(slidesRootDir: string, deckId: string) {
  const absolutePath = path.resolve(slidesRootDir, deckId);

  if (!absolutePath.startsWith(slidesRootDir + path.sep) && absolutePath !== slidesRootDir) {
    throw new Error("Invalid local deck path.");
  }

  return absolutePath;
}

async function listFiles(dir: string, prefix = ""): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = path.join(dir, relativePath);

    if (entry.isDirectory()) {
      files.push(...(await listFiles(dir, relativePath)));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files;
}

async function generateAllDeckOgImages(input: {
  slidesRootDir: string;
  ogImageDir: string;
  defaultDeckId: string;
  ogImageJobs: Map<string, Promise<void>>;
}) {
  const deckIds = await listDeckIds(input.slidesRootDir, input.defaultDeckId);

  await Promise.all(
    deckIds.map(async (deckId) => {
      const resolvedSlidesDir = resolveDeckDir(input.slidesRootDir, deckId);
      const fileNames = await listFiles(resolvedSlidesDir);
      const { slides } = buildSlidesFromFileNames(fileNames, (fileName) => fileName);

      await ensureDeckOgImages({
        ogImageDir: input.ogImageDir,
        deckId,
        slideCount: slides.length,
        ogImageJobs: input.ogImageJobs
      });
    })
  );
}

async function ensureDeckOgImages(input: {
  ogImageDir: string;
  deckId: string;
  slideCount: number;
  ogImageJobs: Map<string, Promise<void>>;
}) {
  const existingJob = input.ogImageJobs.get(input.deckId);
  if (existingJob) {
    await existingJob;
    return;
  }

  const job = generateDeckOgImages(input).finally(() => input.ogImageJobs.delete(input.deckId));
  input.ogImageJobs.set(input.deckId, job);
  await job;
}

async function generateDeckOgImages(input: {
  ogImageDir: string;
  deckId: string;
  slideCount: number;
}) {
  const deckOgDir = path.resolve(input.ogImageDir, input.deckId);
  await fs.mkdir(deckOgDir, { recursive: true });
  await fs.writeFile(
    path.resolve(deckOgDir, DECK_OG_IMAGE_FILE_NAME),
    renderDeckOgImageSvg({
      deckTitle: deckTitleFromDirectoryName(input.deckId),
      metadataLine: deckMetadataLine(input.slideCount, input.deckId)
    })
  );
}

async function listDeckIds(slidesRootDir: string, defaultDeckId: string) {
  const entries = await fs.readdir(slidesRootDir, { withFileTypes: true });
  const deckIds = entries
    .filter((entry) => entry.isDirectory() && isValidLocalDeckId(entry.name))
    .map((entry) => entry.name);

  return deckIds.length > 0 ? deckIds : [defaultDeckId];
}

function encodePath(fileName: string) {
  return fileName.split("/").map(encodeURIComponent).join("/");
}

function deckTitleFromDirectoryName(deckId: string) {
  return deckId;
}

function deckMetadataLine(slideCount: number, deckId: string) {
  return `${slideCount} ${slideCount === 1 ? "slide" : "slides"} · ${deckId}`;
}

function contentTypeFor(filePath: string) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
    case ".mjs":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}
