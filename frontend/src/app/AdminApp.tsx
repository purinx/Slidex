import { useMemo, useState } from "react";
import { SlideList } from "../components/SlideList";
import { UploadDialog } from "../components/UploadDialog";
import { useDeck } from "../hooks/useDeck";

export function AdminApp() {
  const [uploadedDeckId, setUploadedDeckId] = useState<string>();
  const { deck, loadingState, viewerError, reload } = useDeck(uploadedDeckId, {
    enabled: Boolean(uploadedDeckId),
    source: uploadedDeckId ? "api" : "auto"
  });
  const slides = deck?.slides ?? [];
  const shareUrl = useMemo(() => {
    const deckId = deck?.deckId || uploadedDeckId || import.meta.env.VITE_DEFAULT_DECK_ID || "deck-id";
    return new URL(`/deck/${deckId}`, window.location.origin).toString();
  }, [deck?.deckId, uploadedDeckId]);

  return (
    <main className="adminShell">
      <section className="adminHeader">
        <div>
          <h1>New Deck</h1>
          <p>Upload decks and inspect manifest data outside the presentation surface.</p>
        </div>
        <a className="primaryLink" href={shareUrl}>
          Open presentation
        </a>
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
        <UploadDialog
          mode="inline"
          open
          onClose={() => undefined}
          onCompleted={(result) => setUploadedDeckId(result.deckId)}
        />

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
