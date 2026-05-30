import { useMemo, useState } from "react";
import { OgpPreview } from "./OgpPreview";
import { useUpload } from "../hooks/useUpload";
import type { CompleteUploadResponse } from "../data/uploadClient";
import { parseSlideFileName } from "../domain/slideFile";

export function UploadForm({
  onCompleted
}: {
  onCompleted?: (result: CompleteUploadResponse) => void;
}) {
  const upload = useUpload({ onCompleted });
  const [title, setTitle] = useState("");
  const [deckId, setDeckId] = useState("");
  const [description, setDescription] = useState("");
  const [defaultOgImage, setDefaultOgImage] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const submitErrors = submitAttempted ? collectSubmitErrors(title, upload.validation) : [];
  const uploadBusy = ["requestingUploadUrls", "uploading", "completing"].includes(upload.uploadState);
  const previewDeckId = deckId.trim() || "deck-id";
  const previewSlideCount = upload.validation?.candidates.filter((candidate) => parseSlideFileName(candidate.path)).length;
  const previewMetadataLine =
    typeof previewSlideCount === "number" && previewSlideCount > 0
      ? `${previewSlideCount} ${previewSlideCount === 1 ? "slide" : "slides"} · ${previewDeckId}`
      : undefined;
  const shareUrl = useMemo(() => {
    if (upload.completed?.deckUrl) {
      return new URL(upload.completed.deckUrl, window.location.origin).toString();
    }
    return new URL(`/deck/${previewDeckId}`, window.location.origin).toString();
  }, [previewDeckId, upload.completed?.deckUrl]);

  return (
    <section
      className="uploadForm"
      aria-labelledby="upload-title"
    >
        <div className="panelHeader">
          <div>
            <h2 id="upload-title">Upload deck</h2>
            <p>{upload.uploadState}</p>
          </div>
        </div>

        <div className="formGrid">
          <label>
            Deck name
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            Deck ID
            <input value={deckId} onChange={(event) => setDeckId(event.target.value)} placeholder="optional" />
          </label>
          <label className="wideField">
            Description
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label className="wideField">
            OGP image path
            <input
              value={defaultOgImage}
              onChange={(event) => setDefaultOgImage(event.target.value)}
              placeholder="og/default.png"
            />
          </label>
          <label className="fileDrop wideField">
            <span>Select files or a directory</span>
            <input
              type="file"
              multiple
              {...({ webkitdirectory: "" } as Record<string, string>)}
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                const directoryName = inferDirectoryName(files);
                if (directoryName) {
                  setTitle(directoryName);
                }
                upload.selectFiles(files);
              }}
            />
          </label>
        </div>

        {upload.validation ? (
          <div className={upload.validation.valid ? "validationBox valid" : "validationBox invalid"}>
            <strong>
              {upload.validation.candidates.length} files, {formatBytes(upload.validation.totalSize)}
            </strong>
            {upload.validation.errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
            {upload.validation.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}

        {submitErrors.length > 0 ? (
          <div className="validationBox invalid" role="alert">
            {submitErrors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        ) : null}

        {upload.error ? (
          <div className="validationBox invalid" role="alert">
            {upload.error}
          </div>
        ) : null}

        <div className="progressTrack" aria-label="Upload progress">
          <span style={{ width: `${upload.progress}%` }} />
        </div>

        <OgpPreview
          title={title || "SlideX Deck"}
          description={description}
          imageUrl={defaultOgImage || undefined}
          metadataLine={previewMetadataLine}
          shareUrl={shareUrl}
        />

        <div className="dialogActions">
          <button
            type="button"
            className="iconButton"
            onClick={() => {
              setSubmitAttempted(false);
              upload.reset();
            }}
          >
            Reset
          </button>
          <button
            type="button"
            className="primaryButton"
            disabled={uploadBusy}
            onClick={() => {
              setSubmitAttempted(true);
              const errors = collectSubmitErrors(title, upload.validation);
              if (errors.length > 0) {
                return;
              }

              void upload.upload({
                title: title.trim(),
                deckId: deckId.trim() || undefined,
                description: description.trim() || undefined,
                defaultOgImage: defaultOgImage.trim() || undefined
              });
            }}
          >
            Upload
          </button>
        </div>
      </section>
  );
}

function collectSubmitErrors(
  title: string,
  validation: ReturnType<typeof useUpload>["validation"]
) {
  const errors: string[] = [];

  if (!title.trim()) {
    errors.push("Deck name is required.");
  }

  if (!validation) {
    errors.push("Select files or a directory.");
  } else if (!validation.valid) {
    errors.push("Selected files are not valid.");
  }

  return errors;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function inferDirectoryName(files: File[]) {
  const roots = new Set(
    files
      .map((file) => file.webkitRelativePath.split("/")[0])
      .filter((root): root is string => Boolean(root))
  );

  return roots.size === 1 ? [...roots][0] : undefined;
}
