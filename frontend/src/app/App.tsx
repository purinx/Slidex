import { AdminApp } from "./AdminApp";
import { PresentationApp } from "./PresentationApp";
import { TopApp } from "./TopApp";

export function App() {
  if (window.location.pathname.startsWith("/admin")) {
    return <AdminApp />;
  }

  if (window.location.pathname === "/" && !new URLSearchParams(window.location.search).has("slide")) {
    return <TopApp />;
  }

  return <PresentationApp />;
}
