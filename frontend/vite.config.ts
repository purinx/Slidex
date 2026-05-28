import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import { localSlidesPlugin } from "./src/vite/slidesMiddleware";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      localSlidesPlugin(env.VITE_SLIDES_DIR || "../fixtures/slides", env.VITE_DEFAULT_DECK_ID || "slidex")
    ],
    test: {
      environment: "jsdom",
      globals: true
    }
  };
});
