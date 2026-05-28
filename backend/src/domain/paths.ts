import { badRequest } from "./errors.js";

const WINDOWS_DRIVE_PATTERN = /^[A-Za-z]:/;

export function normalizeUploadPath(input: string) {
  const path = input.replaceAll("\\", "/").replace(/^\.\/+/, "");

  if (!path || path.startsWith("/") || WINDOWS_DRIVE_PATTERN.test(path)) {
    throw badRequest("INVALID_FILE_PATH", "File path must be a relative path.", { path: input });
  }

  const parts = path.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    throw badRequest("INVALID_FILE_PATH", "File path must not contain empty, dot, or parent segments.", {
      path: input
    });
  }

  return path;
}

export function objectKey(prefix: string, deckId: string, path: string) {
  const cleanPrefix = prefix.replace(/^\/+|\/+$/g, "");
  return cleanPrefix ? `${cleanPrefix}/${deckId}/${path}` : `${deckId}/${path}`;
}

export function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}
