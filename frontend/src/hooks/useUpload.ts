import { useMemo, useState } from "react";
import {
  completeUpload,
  createDeck,
  putFileToSignedUrl,
  requestUploadUrls,
  type CompleteUploadResponse
} from "../data/uploadClient";
import {
  validateUploadFiles,
  type UploadValidationResult
} from "../domain/uploadValidation";

export type UploadState =
  | "selecting"
  | "validating"
  | "requestingUploadUrls"
  | "uploading"
  | "completing"
  | "completed"
  | "failed";

export function useUpload(options?: { onCompleted?: (result: CompleteUploadResponse) => void }) {
  const [uploadState, setUploadState] = useState<UploadState>("selecting");
  const [validation, setValidation] = useState<UploadValidationResult>();
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>();
  const [completed, setCompleted] = useState<CompleteUploadResponse>();

  const limits = useMemo(
    () => ({
      maxFileSize: readMegabytes(import.meta.env.VITE_UPLOAD_MAX_FILE_SIZE_MB, 20),
      maxDeckSize: readMegabytes(import.meta.env.VITE_UPLOAD_MAX_DECK_SIZE_MB, 200)
    }),
    []
  );

  const selectFiles = (files: File[]) => {
    setUploadState("validating");
    setError(undefined);
    setCompleted(undefined);
    const result = validateUploadFiles(files, limits);
    setValidation(result);
    setUploadState("selecting");
  };

  const upload = async (input: {
    title: string;
    description?: string;
    deckId?: string;
    defaultOgImage?: string;
  }) => {
    if (!validation?.valid) {
      setError("Upload files are not valid.");
      return;
    }

    try {
      setError(undefined);
      setProgress(0);
      setUploadState("requestingUploadUrls");
      const deck = await createDeck({
        title: input.title,
        description: input.description,
        deckId: input.deckId
      });
      const urls = await requestUploadUrls(deck.deckId, validation.candidates);
      const uploadByPath = new Map(urls.uploads.map((entry) => [entry.path, entry]));
      let uploadedBytes = 0;
      const totalBytes = Math.max(validation.totalSize, 1);

      setUploadState("uploading");
      for (const candidate of validation.candidates) {
        const uploadUrl = uploadByPath.get(candidate.path);
        if (!uploadUrl) {
          throw new Error(`${candidate.path}: signed upload URL was not returned.`);
        }

        let lastLoaded = 0;
        await putFileToSignedUrl(candidate, uploadUrl, (loaded) => {
          setProgress(Math.min(99, Math.round(((uploadedBytes + loaded) / totalBytes) * 100)));
          lastLoaded = loaded;
        });
        uploadedBytes += Math.max(lastLoaded, candidate.file.size);
        setProgress(Math.min(99, Math.round((uploadedBytes / totalBytes) * 100)));
      }

      setUploadState("completing");
      const result = await completeUpload(deck.deckId, validation.candidates, {
        title: input.title,
        description: input.description,
        defaultOgImage: input.defaultOgImage
      });
      setCompleted(result);
      options?.onCompleted?.(result);
      setProgress(100);
      setUploadState("completed");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
      setUploadState("failed");
    }
  };

  const reset = () => {
    setUploadState("selecting");
    setValidation(undefined);
    setProgress(0);
    setError(undefined);
    setCompleted(undefined);
  };

  return {
    uploadState,
    validation,
    progress,
    error,
    completed,
    selectFiles,
    upload,
    reset
  };
}

function readMegabytes(value: string | undefined, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric * 1024 * 1024 : fallback * 1024 * 1024;
}
