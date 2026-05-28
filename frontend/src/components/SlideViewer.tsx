import { useEffect, useRef, useState, type MutableRefObject, type WheelEvent } from "react";
import type { Slide } from "../domain/slideManifest";

export function SlideViewer({
  slide,
  onHorizontalScroll
}: {
  slide?: Slide;
  onHorizontalScroll?: (direction: "previous" | "next") => void;
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const accumulatedDeltaX = useRef(0);
  const lastNavigationAt = useRef(0);
  const gestureLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFailedUrl(undefined);
    accumulatedDeltaX.current = 0;
  }, [slide?.url]);

  useEffect(() => {
    if (onHorizontalScroll) {
      gestureLayerRef.current?.focus({ preventScroll: true });
    }
  }, [onHorizontalScroll, slide?.url]);

  if (!slide) {
    return (
      <div className="viewerEmpty" role="status">
        <h2>No slides found</h2>
        <p>Place files named NN__title.html in the configured slides directory.</p>
      </div>
    );
  }

  return (
    <main className="slideStage">
      {failedUrl ? (
        <div className="viewerError" role="alert">
          <h2>Slide failed to load</h2>
          <p>{slide.fileName}</p>
          <code>{failedUrl}</code>
        </div>
      ) : null}
      <iframe
        key={slide.url}
        className="slideFrame"
        src={slide.url}
        title={slide.title}
        onError={() => setFailedUrl(slide.url)}
      />
      {onHorizontalScroll ? (
        <div
          ref={gestureLayerRef}
          className="slideGestureLayer"
          tabIndex={-1}
          aria-hidden="true"
          onWheel={(event) => handleWheel(event, onHorizontalScroll, accumulatedDeltaX, lastNavigationAt)}
        />
      ) : null}
    </main>
  );
}

function handleWheel(
  event: WheelEvent<HTMLDivElement>,
  onHorizontalScroll: (direction: "previous" | "next") => void,
  accumulatedDeltaX: MutableRefObject<number>,
  lastNavigationAt: MutableRefObject<number>
) {
  const deltaX = normalizeWheelDelta(event.deltaX, event.deltaMode);
  const deltaY = normalizeWheelDelta(event.deltaY, event.deltaMode);

  if (Math.abs(deltaX) <= Math.abs(deltaY) || Math.abs(deltaX) < 4) {
    accumulatedDeltaX.current = 0;
    return;
  }

  event.preventDefault();

  const now = Date.now();
  if (now - lastNavigationAt.current < 420) {
    return;
  }

  accumulatedDeltaX.current += deltaX;

  if (Math.abs(accumulatedDeltaX.current) < 90) {
    return;
  }

  onHorizontalScroll(accumulatedDeltaX.current > 0 ? "next" : "previous");
  accumulatedDeltaX.current = 0;
  lastNavigationAt.current = now;
}

function normalizeWheelDelta(delta: number, deltaMode: number) {
  if (deltaMode === 1) {
    return delta * 16;
  }

  if (deltaMode === 2) {
    return delta * window.innerWidth;
  }

  return delta;
}
