import { renderDeckOgImageSvg } from "../domain/ogImage";

export function OgpPreview({
  title,
  description,
  imageUrl,
  metadataLine,
  shareUrl
}: {
  title: string;
  description?: string;
  imageUrl?: string;
  metadataLine?: string;
  shareUrl: string;
}) {
  const generatedImageUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    renderDeckOgImageSvg({
      deckTitle: title,
      description,
      metadataLine
    })
  )}`;
  const previewImageUrl = imageUrl || generatedImageUrl;

  return (
    <section className="ogpPreview" aria-label="OGP preview">
      <div className="ogpImage">
        <img src={previewImageUrl} alt="" />
      </div>
      <div>
        <p className="ogpHost">{new URL(shareUrl, window.location.href).host || "localhost"}</p>
        <h3>{title}</h3>
        <p>{description || "SlideX deck preview"}</p>
        <code>{shareUrl}</code>
      </div>
    </section>
  );
}
