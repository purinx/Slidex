import { AdminApp } from "./AdminApp";
import { PresentationApp } from "./PresentationApp";

export function App() {
  return window.location.pathname.startsWith("/admin") ? <AdminApp /> : <PresentationApp />;
}
