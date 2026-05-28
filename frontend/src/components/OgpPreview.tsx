export function OgpPreview({
  title,
  description,
  imageUrl,
  shareUrl
}: {
  title: string;
  description?: string;
  imageUrl?: string;
  shareUrl: string;
}) {
  return (
    <section className="ogpPreview" aria-label="OGP preview">
      <div className="ogpImage">
        {imageUrl ? <img src={imageUrl} alt="" /> : <span>OGP</span>}
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
