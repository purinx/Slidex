import fs from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import type { Connect, Plugin } from "vite";
import { buildSlidesFromFileNames } from "../domain/slideFile";

const DECK_ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;

export function localSlidesPlugin(slidesRootDir: string, defaultDeckId = "slidex"): Plugin {
  return {
    name: "slidex-local-slides",
    configureServer(server) {
      const root = server.config.root;
      const resolvedSlidesRootDir = path.resolve(root, slidesRootDir);

      server.middlewares.use("/__slides", async (request, response) => {
        try {
          const deckId = deckIdFromRequest(request, defaultDeckId);
          const resolvedSlidesDir = resolveDeckDir(resolvedSlidesRootDir, deckId);
          const fileNames = await listFiles(resolvedSlidesDir);
          const { slides, warnings } = buildSlidesFromFileNames(
            fileNames,
            (fileName) => `/__slide-files/${encodeURIComponent(deckId)}/${encodePath(fileName)}`
          );

          response.statusCode = 200;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(
            JSON.stringify({
              deckId,
              title: `Local SlideX Deck - ${deckId}`,
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

function deckIdFromRequest(request: IncomingMessage, defaultDeckId: string) {
  const path = middlewarePath(request, "__slides");
  const deckId = decodeURIComponent(path.split("/")[0] || defaultDeckId);
  return validateDeckId(deckId);
}

function slideFileRequest(request: IncomingMessage, defaultDeckId: string) {
  const parts = middlewarePath(request, "__slide-files").split("/");
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
  if (!DECK_ID_PATTERN.test(deckId)) {
    throw new Error("Invalid local deck id.");
  }

  return deckId;
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

function encodePath(fileName: string) {
  return fileName.split("/").map(encodeURIComponent).join("/");
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
