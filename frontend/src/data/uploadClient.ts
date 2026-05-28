import { apiFetch } from "./apiClient";
import type { UploadCandidate } from "../domain/uploadValidation";

export type CreateDeckRequest = {
  title: string;
  description?: string;
  deckId?: string;
};

export type CreateDeckResponse = {
  deckId: string;
  uploadPrefix: string;
};

export type UploadUrlEntry = {
  path: string;
  key: string;
  url: string;
  expiresAt: string;
};

export type UploadUrlsResponse = {
  deckId: string;
  uploads: UploadUrlEntry[];
  warnings?: string[];
};

export type CompleteUploadResponse = {
  deckId: string;
  manifestUrl: string;
  deckUrl: string;
  slides: number;
};

export async function createDeck(input: CreateDeckRequest, adminToken: string) {
  return apiFetch<CreateDeckResponse>("/api/decks", jsonRequest(input, adminToken));
}

export async function requestUploadUrls(deckId: string, candidates: UploadCandidate[], adminToken: string) {
  return apiFetch<UploadUrlsResponse>(
    `/api/decks/${encodeURIComponent(deckId)}/uploads`,
    jsonRequest({
      files: candidates.map((candidate) => ({
        path: candidate.path,
        size: candidate.file.size,
        contentType: candidate.contentType
      }))
    }, adminToken)
  );
}

export async function completeUpload(
  deckId: string,
  candidates: UploadCandidate[],
  metadata: { title: string; description?: string; defaultOgImage?: string },
  adminToken: string
) {
  return apiFetch<CompleteUploadResponse>(
    `/api/decks/${encodeURIComponent(deckId)}/complete`,
    jsonRequest({
      files: candidates.map((candidate) => ({
        path: candidate.path,
        size: candidate.file.size,
        contentType: candidate.contentType
      })),
      metadata
    }, adminToken)
  );
}

export function putFileToSignedUrl(
  candidate: UploadCandidate,
  upload: UploadUrlEntry,
  onProgress?: (loaded: number, total: number) => void
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", upload.url);
    request.setRequestHeader("Content-Type", candidate.contentType);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(event.loaded, event.total);
      }
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
      } else {
        reject(new Error(`${candidate.path}: upload failed with ${request.status}.`));
      }
    };

    request.onerror = () => reject(new Error(`${candidate.path}: upload failed.`));
    request.send(candidate.file);
  });
}

function jsonRequest(body: unknown, adminToken: string): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify(body)
  };
}
