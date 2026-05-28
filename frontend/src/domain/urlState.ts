import type { Slide } from "./slideManifest";

export function getDeckIdFromPath(pathname = window.location.pathname) {
  const match = /^\/deck\/([^/]+)/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function getSlideParam(search = window.location.search) {
  return new URLSearchParams(search).get("slide") ?? undefined;
}

export function resolveSlideFromParam(slides: Slide[], slideParam?: string) {
  if (slides.length === 0) {
    return undefined;
  }

  if (!slideParam) {
    return slides[0];
  }

  const numeric = Number(slideParam);
  return (
    slides.find((slide) => slide.orderText === slideParam) ??
    slides.find((slide) => slide.order === numeric) ??
    slides[0]
  );
}

export function writeSlideParam(slide: Slide, historyMode: "push" | "replace" = "push") {
  const url = new URL(window.location.href);
  url.searchParams.set("slide", slide.orderText);
  window.history[historyMode === "push" ? "pushState" : "replaceState"]({}, "", url);
}
