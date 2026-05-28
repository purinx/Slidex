import { badRequest } from "./errors.js";
import { normalizeUploadPath } from "./paths.js";
import { parseSlideFileName } from "./slideFile.js";

export type UploadFileDescriptor = {
  path: string;
  size: number;
  contentType: string;
};

export type NormalizedUploadFile = UploadFileDescriptor & {
  extension: string;
};

export type UploadLimits = {
  maxFileSize: number;
  maxDeckSize: number;
};

const ALLOWED_EXTENSIONS = new Set([
  ".html",
  ".css",
  ".js",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
  ".woff",
  ".woff2",
  ".json"
]);

export function validateUploadFiles(files: UploadFileDescriptor[], limits: UploadLimits) {
  if (!Array.isArray(files) || files.length === 0) {
    throw badRequest("INVALID_FILE_PATH", "At least one file is required.");
  }

  const normalized: NormalizedUploadFile[] = [];
  const seenOrders = new Map<number, string>();
  let totalSize = 0;
  let slideCount = 0;

  for (const file of files) {
    const normalizedPath = normalizeUploadPath(file.path);
    const extension = getExtension(normalizedPath);
    totalSize += file.size;

    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw badRequest("INVALID_FILE_PATH", "File extension is not allowed.", { path: file.path });
    }

    if (!Number.isFinite(file.size) || file.size <= 0) {
      throw badRequest("INVALID_FILE_PATH", "File size must be greater than zero.", { path: file.path });
    }

    if (file.size > limits.maxFileSize) {
      throw badRequest("FILE_TOO_LARGE", "File size exceeds the configured limit.", { path: file.path });
    }

    if (normalizedPath.toLowerCase() === "index.html" || normalizedPath.toLowerCase().endsWith("/index.html")) {
      throw badRequest("INVALID_SLIDE_FILENAME", "index.html is reserved for the app shell.", {
        path: file.path
      });
    }

    if (extension === ".html") {
      const parsed = parseSlideFileName(normalizedPath);
      if (!parsed) {
        throw badRequest("INVALID_SLIDE_FILENAME", "HTML slide file must match NN__title.html.", {
          path: file.path
        });
      }

      const duplicate = seenOrders.get(parsed.order);
      if (duplicate) {
        throw badRequest("DUPLICATE_SLIDE_ORDER", "Slide order is duplicated.", {
          path: file.path,
          duplicate
        });
      }

      seenOrders.set(parsed.order, normalizedPath);
      slideCount += 1;
    }

    normalized.push({
      path: normalizedPath,
      size: file.size,
      contentType: file.contentType || "application/octet-stream",
      extension
    });
  }

  if (slideCount === 0) {
    throw badRequest("INVALID_SLIDE_FILENAME", "At least one HTML slide is required.");
  }

  if (totalSize > limits.maxDeckSize) {
    throw badRequest("DECK_TOO_LARGE", "Deck size exceeds the configured limit.");
  }

  return normalized;
}

function getExtension(path: string) {
  const dotIndex = path.lastIndexOf(".");
  return dotIndex >= 0 ? path.slice(dotIndex).toLowerCase() : "";
}
