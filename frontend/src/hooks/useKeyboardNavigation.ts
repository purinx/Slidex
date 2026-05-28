import { useEffect } from "react";

export function useKeyboardNavigation(actions: {
  next: () => void;
  previous: () => void;
  first: () => void;
  last: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return;
      }

      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        actions.next();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        actions.previous();
      } else if (event.key === "Home") {
        event.preventDefault();
        actions.first();
      } else if (event.key === "End") {
        event.preventDefault();
        actions.last();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actions]);
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}
