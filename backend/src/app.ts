import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { AppError } from "./domain/errors.js";
import { readAppHtml, readStaticAsset } from "./infra/appHtml.js";
import { contentTypeFor } from "./infra/contentType.js";
import type { Env } from "./infra/env.js";
import type { ObjectStorage } from "./infra/storage.js";
import { createDeckRoutes } from "./routes/decks.js";
import { createFileRoutes } from "./routes/files.js";
import { createOgpRoutes } from "./routes/ogp.js";

export type AppDeps = {
  env: Env;
  storage: ObjectStorage;
};

export function createApp(deps: AppDeps) {
  const app = new Hono();
  let appHtmlCache: string | undefined;
  const getAppHtml = async () => {
    appHtmlCache ??= await readAppHtml(deps.env.frontendDistDir);
    return appHtmlCache;
  };

  app.use(
    "/api/*",
    cors({
      origin: "*",
      allowHeaders: ["Content-Type"],
      allowMethods: ["GET", "POST", "PUT", "OPTIONS"]
    })
  );

  app.onError((error, c) => {
    if (error instanceof AppError) {
      return c.json(
        {
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        },
        error.status as ContentfulStatusCode
      );
    }

    console.error(error);
    return c.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Internal server error."
        }
      },
      500
    );
  });

  app.get("/healthz", (c) =>
    c.json({
      ok: true
    })
  );

  app.route("/api/decks", createDeckRoutes(deps));
  app.route("/api/decks", createFileRoutes(deps));
  app.route("/deck", createOgpRoutes({ ...deps, getAppHtml }));

  app.get("/assets/*", async (c) => {
    const relativePath = c.req.path.replace(/^\/+/, "");
    const asset = await readStaticAsset(deps.env.frontendDistDir, relativePath);

    if (!asset) {
      return c.notFound();
    }

    return new Response(asset, {
      headers: {
        "Content-Type": contentTypeFor(relativePath),
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  });

  app.get("/", async (c) => c.html(await getAppHtml()));
  app.get("/admin", async (c) => c.html(await getAppHtml()));
  app.get("/admin/*", async (c) => c.html(await getAppHtml()));
  app.get("*", async (c) => c.html(await getAppHtml()));

  return app;
}
