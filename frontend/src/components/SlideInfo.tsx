export function SlideInfo({
  title,
  position,
  total
}: {
  title: string;
  position: number;
  total: number;
}) {
  return (
    <header className="presentationInfo" aria-label="Slide information">
      <span className="appMark">SlideX</span>
      <span className="slideTitle">{title}</span>
      <span className="slideCounter" aria-live="polite">
        {total > 0 ? `${position} / ${total}` : "0 / 0"}
      </span>
    </header>
  );
}
