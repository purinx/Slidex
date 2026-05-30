import { useCallback, useEffect, useState } from "react";
import { fetchDeckList } from "../data/deckListSource";
import type { DeckSummary } from "../domain/slideManifest";

export function TopApp() {
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadDecks = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      setDecks(await fetchDeckList());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load deck list.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDecks();
  }, [loadDecks]);

  return (
    <main className="topShell">
      <section className="topHeader">
        <div>
          <h1>Decks</h1>
          <p>Select a deck to open it in the presentation viewer.</p>
        </div>
        <a className="primaryLink" href="/admin">
          + Add Deck
        </a>
      </section>

      {error ? (
        <div className="validationBox invalid topStatus" role="alert">
          <span>{error}</span>
          <button type="button" className="iconButton" onClick={() => void loadDecks()}>
            Retry
          </button>
        </div>
      ) : null}

      <section className="topDeckSection" aria-label="Decks">
        {decks.length > 0 ? (
          <ul className="topDeckGrid">
            {decks.map((deck) => (
              <li key={deck.deckId}>
                <a
                  className="topDeckItem"
                  href={`/deck/${encodeURIComponent(deck.deckId)}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${deck.title}, ${deck.slideCount} slides`}
                >
                  <div className="topDeckThumb" aria-hidden="true">
                    {deck.ogImage ? <img src={deck.ogImage} alt="" loading="lazy" /> : <span>{deck.title}</span>}
                  </div>
                  {deck.description ? <p>{deck.description}</p> : null}
                  {deck.warnings?.length ? <em>{deck.warnings.length} warnings</em> : null}
                </a>
              </li>
            ))}
          </ul>
        ) : loading ? null : (
          <div className="viewerEmpty compact" role="status">
            <h2>No decks found</h2>
            <p>Place deck directories under the configured slides directory.</p>
          </div>
        )}
      </section>
    </main>
  );
}
