import { useState } from "react";
import { SlideList } from "../components/SlideList";
import { UploadForm } from "../components/UploadForm";
import { useDeck } from "../hooks/useDeck";

export function AdminApp() {
  const [uploadedDeckId, setUploadedDeckId] = useState<string>();
  const { deck, loadingState, viewerError, reload } = useDeck(uploadedDeckId, {
    enabled: Boolean(uploadedDeckId),
    source: uploadedDeckId ? "api" : "auto"
  });
  const slides = deck?.slides ?? [];

  return (
    <main className="adminShell">
      <section className="adminHeader">
        <div>
          <h1>New Deck</h1>
          <p>Upload decks and inspect manifest data outside the presentation surface.</p>
        </div>
      </section>

      {uploadedDeckId && viewerError ? (
        <div className="validationBox invalid" role="alert">
          <span>{viewerError}</span>
          <button type="button" className="iconButton" onClick={() => void reload()}>
            Retry
          </button>
        </div>
      ) : null}

      <section className="adminGrid">
        <UploadForm onCompleted={(result) => setUploadedDeckId(result.deckId)} />

        {uploadedDeckId ? (
          <section className="adminPanel">
            <div className="panelHeader">
              <div>
                <h2>Current manifest</h2>
                <p>{loadingState === "loadingManifest" ? "Loading" : `${slides.length} slides`}</p>
              </div>
            </div>
            <SlideList
              open
              embedded
              slides={slides}
              warnings={deck?.warnings ?? []}
              currentOrder={slides[0]?.order}
              onSelect={() => undefined}
              onClose={() => undefined}
            />
          </section>
        ) : null}
      </section>
    </main>
  );
}
