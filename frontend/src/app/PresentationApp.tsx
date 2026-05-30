import { useCallback, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { SlideViewer } from "../components/SlideViewer";
import { useDeck } from "../hooks/useDeck";
import { useKeyboardNavigation } from "../hooks/useKeyboardNavigation";
import type { Slide } from "../domain/slideManifest";
import {
  getDeckIdFromPath,
  getSlideParam,
  resolveSlideFromParam,
  writeSlideParam
} from "../domain/urlState";

export function PresentationApp() {
  const deckId = getDeckIdFromPath();
  const { deck, loadingState, viewerError, reload } = useDeck(deckId);
  const [currentOrder, setCurrentOrder] = useState<number>();

  const slides = deck?.slides ?? [];
  const currentIndex = slides.findIndex((slide) => slide.order === currentOrder);
  const currentSlide = currentIndex >= 0 ? slides[currentIndex] : undefined;

  const commitSlide = useCallback((slide: Slide, historyMode: "push" | "replace" = "push") => {
    setCurrentOrder(slide.order);
    writeSlideParam(slide, historyMode);
  }, []);

  const selectSlide = useCallback(
    (slide: Slide, historyMode: "push" | "replace" = "push") => {
      if (!currentOrder || slide.order === currentOrder || !document.startViewTransition) {
        commitSlide(slide, historyMode);
        return;
      }

      const direction = slide.order > currentOrder ? "next" : "previous";
      document.documentElement.dataset.slideTransition = direction;

      const transition = document.startViewTransition(() => {
        flushSync(() => commitSlide(slide, historyMode));
      });

      void transition.finished.finally(() => {
        delete document.documentElement.dataset.slideTransition;
      });
    },
    [commitSlide, currentOrder]
  );

  useEffect(() => {
    if (slides.length === 0) {
      setCurrentOrder(undefined);
      return;
    }

    const selected = resolveSlideFromParam(slides, getSlideParam());
    if (selected) {
      commitSlide(selected, "replace");
    }
  }, [commitSlide, slides]);

  useEffect(() => {
    const onPopState = () => {
      const selected = resolveSlideFromParam(slides, getSlideParam());
      if (selected) {
        commitSlide(selected, "replace");
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [commitSlide, slides]);

  const goToIndex = useCallback(
    (index: number) => {
      const nextSlide = slides[index];
      if (nextSlide) {
        selectSlide(nextSlide);
      }
    },
    [selectSlide, slides]
  );

  const navigation = useMemo(
    () => ({
      previous: () => goToIndex(Math.max(currentIndex - 1, 0)),
      next: () => goToIndex(Math.min(currentIndex + 1, slides.length - 1)),
      first: () => goToIndex(0),
      last: () => goToIndex(slides.length - 1)
    }),
    [currentIndex, goToIndex, slides.length]
  );

  useKeyboardNavigation(navigation);

  const handleHorizontalScroll = useCallback(
    (direction: "previous" | "next") => {
      if (direction === "next") {
        navigation.next();
      } else {
        navigation.previous();
      }
    },
    [navigation]
  );

  const statusMessage =
    loadingState === "loadingManifest"
      ? "Loading manifest..."
      : viewerError || (slides.length === 0 ? "No slide files are available." : undefined);

  return (
    <div className="presentationShell">
      <SlideViewer
        slide={currentSlide}
        onHorizontalScroll={handleHorizontalScroll}
      />

      {statusMessage ? (
        <div className={viewerError ? "statusToast error" : "statusToast"} role="status">
          <span>{statusMessage}</span>
          {viewerError ? (
            <button type="button" onClick={() => void reload()}>
              Retry
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
