import { parseSlideFileName } from "./slideFile";

export type UploadFileLike = {
  name: string;
  size: number;
  type?: string;
  webkitRelativePath?: string;
};

export type UploadCandidate = {
  file: File;
  path: string;
  contentType: string;
};

export type UploadValidationResult = {
  valid: boolean;
  candidates: UploadCandidate[];
  errors: string[];
  warnings: string[];
  totalSize: number;
};

const DEFAULT_MAX_FILE_SIZE = 20 * 1024 * 1024;
const DEFAULT_MAX_DECK_SIZE = 200 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  ".html",
  ".css",
  ".js",
  ".mjs",
  ".json",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".txt",
  ".map"
]);

export function getUploadPath(file: UploadFileLike) {
  return file.webkitRelativePath || file.name;
}

export function validateUploadFiles(
  files: File[],
  options: { maxFileSize?: number; maxDeckSize?: number } = {}
): UploadValidationResult {
  const maxFileSize = options.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
  const maxDeckSize = options.maxDeckSize ?? DEFAULT_MAX_DECK_SIZE;
  const errors: string[] = [];
  const warnings: string[] = [];
  const candidates: UploadCandidate[] = [];
  const seenOrders = new Map<number, string>();
  let slideCount = 0;
  let totalSize = 0;

  for (const file of files) {
    const path = getUploadPath(file);
    const lowerPath = path.toLowerCase();
    const extension = lowerPath.includes(".") ? lowerPath.slice(lowerPath.lastIndexOf(".")) : "";
    totalSize += file.size;

    if (path.includes("..")) {
      errors.push(`${path}: path traversal is not allowed.`);
      continue;
    }

    if (!ALLOWED_EXTENSIONS.has(extension)) {
      errors.push(`${path}: extension is not allowed.`);
      continue;
    }

    if (file.size === 0) {
      errors.push(`${path}: empty files are not allowed.`);
    }

    if (file.size > maxFileSize) {
      errors.push(`${path}: file size exceeds the configured limit.`);
    }

    if (lowerPath.endsWith("/index.html") || lowerPath === "index.html") {
      errors.push(`${path}: index.html is reserved for the app shell.`);
    }

    if (extension === ".html") {
      const parsed = parseSlideFileName(path);
      if (parsed) {
        slideCount += 1;
        const duplicate = seenOrders.get(parsed.order);
        if (duplicate) {
          errors.push(`${path}: slide order duplicates ${duplicate}.`);
        } else {
          seenOrders.set(parsed.order, path);
        }
      } else if (!lowerPath.endsWith("index.html")) {
        warnings.push(`${path}: HTML file does not match NN__title.html and will not be a slide.`);
      }
    }

    candidates.push({
      file,
      path,
      contentType: file.type || guessContentType(extension)
    });
  }

  if (slideCount === 0) {
    errors.push("At least one NN__title.html slide is required.");
  }

  if (totalSize > maxDeckSize) {
    errors.push("Total deck size exceeds the configured limit.");
  }

  return {
    valid: errors.length === 0,
    candidates,
    errors,
    warnings,
    totalSize
  };
}

function guessContentType(extension: string) {
  switch (extension) {
    case ".html":
      return "text/html";
    case ".css":
      return "text/css";
    case ".js":
    case ".mjs":
      return "text/javascript";
    case ".json":
      return "application/json";
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
