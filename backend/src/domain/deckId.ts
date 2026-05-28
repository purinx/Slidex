import { badRequest } from "./errors.js";

const DECK_ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;

export function validateDeckId(deckId: string) {
  if (!DECK_ID_PATTERN.test(deckId)) {
    throw badRequest("INVALID_DECK_ID", "deckId must be 1-80 characters of letters, numbers, hyphen, or underscore.", {
      deckId
    });
  }

  return deckId;
}

export function createDeckId(title?: string) {
  const base =
    title
      ?.normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase()
      .slice(0, 48) || "deck";
  const suffix = crypto.randomUUID().slice(0, 8);
  return validateDeckId(`${base}-${suffix}`);
}
