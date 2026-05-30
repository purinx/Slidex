import { useMemo, useState } from "react";
import { OgpPreview } from "./OgpPreview";
import { useUpload } from "../hooks/useUpload";
import type { CompleteUploadResponse } from "../data/uploadClient";

export function UploadDialog({
  open,
  onClose,
  mode = "dialog",
  onCompleted
}: {
  open: boolean;
  onClose: () => void;
  mode?: "dialog" | "inline";
  onCompleted?: (result: CompleteUploadResponse) => void;
}) {
  const upload = useUpload({ onCompleted });
  const [title, setTitle] = useState("");
  const [deckId, setDeckId] = useState("");
  const [description, setDescription] = useState("");
  const [defaultOgImage, setDefaultOgImage] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const submitErrors = submitAttempted ? collectSubmitErrors(title, adminToken, upload.validation) : [];
  const uploadBusy = ["requestingUploadUrls", "uploading", "completing"].includes(upload.uploadState);
  const shareUrl = useMemo(() => {
    if (upload.completed?.deckUrl) {
      return new URL(upload.completed.deckUrl, window.location.origin).toString();
    }
    const candidate = deckId.trim() || "deck-id";
    return new URL(`/deck/${candidate}`, window.location.origin).toString();
  }, [deckId, upload.completed?.deckUrl]);

  if (!open) {
    return null;
  }

  const panel = (
    <section
      className={mode === "inline" ? "uploadDialog inline" : "uploadDialog"}
      role={mode === "dialog" ? "dialog" : undefined}
      aria-modal={mode === "dialog" ? "true" : undefined}
      aria-labelledby="upload-title"
    >
        <div className="panelHeader">
          <div>
            <h2 id="upload-title">Upload deck</h2>
            <p>{upload.uploadState}</p>
          </div>
          {mode === "dialog" ? (
            <button type="button" className="iconButton" onClick={onClose} aria-label="Close upload dialog">
              Close
            </button>
          ) : null}
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
            Admin token
            <input
              type="password"
              value={adminToken}
              onChange={(event) => setAdminToken(event.target.value)}
              autoComplete="off"
            />
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
              const errors = collectSubmitErrors(title, adminToken, upload.validation);
              if (errors.length > 0) {
                return;
              }

              void upload.upload({
                title: title.trim(),
                adminToken: adminToken.trim(),
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

  if (mode === "inline") {
    return panel;
  }

  return (
    <div className="dialogBackdrop" role="presentation">
      {panel}
    </div>
  );
}

function collectSubmitErrors(
  title: string,
  adminToken: string,
  validation: ReturnType<typeof useUpload>["validation"]
) {
  const errors: string[] = [];

  if (!title.trim()) {
    errors.push("Deck name is required.");
  }

  if (!adminToken.trim()) {
    errors.push("Admin token is required.");
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
