import type { Slide, SlideWarning } from "../domain/slideManifest";

export function SlideList({
  open,
  slides,
  warnings,
  currentOrder,
  onSelect,
  onClose,
  embedded = false
}: {
  open: boolean;
  embedded?: boolean;
  slides: Slide[];
  warnings: SlideWarning[];
  currentOrder?: number;
  onSelect: (slide: Slide) => void;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <aside className={embedded ? "slideListPanel embedded" : "slideListPanel"} aria-label="Slide list">
      {!embedded ? (
        <div className="panelHeader">
          <div>
            <h2>Slides</h2>
            <p>{slides.length} files</p>
          </div>
          <button type="button" className="iconButton" onClick={onClose} aria-label="Close slide list">
            Close
          </button>
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div className="warningBox" role="status">
          {warnings.map((warning) => (
            <p key={`${warning.code}-${warning.fileName ?? warning.message}`}>{warning.message}</p>
          ))}
        </div>
      ) : null}

      <div className="slideListItems">
        {slides.map((slide) => (
          <button
            type="button"
            className={slide.order === currentOrder ? "slideListItem current" : "slideListItem"}
            key={slide.fileName}
            onClick={() => onSelect(slide)}
          >
            <span>{slide.orderText}</span>
            <strong>{slide.title}</strong>
            <small>{slide.fileName}</small>
          </button>
        ))}
      </div>
    </aside>
  );
}
