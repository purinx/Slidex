import type { MiddlewareHandler } from "hono";
import { unauthorized } from "../domain/errors.js";
import type { Env } from "../infra/env.js";

export function requireAdminAuth(env: Env): MiddlewareHandler {
  return async (c, next) => {
    if (!env.uploadAdminToken) {
      throw unauthorized("UPLOAD_ADMIN_TOKEN is not configured.");
    }

    const authorization = c.req.header("Authorization");
    if (authorization !== `Bearer ${env.uploadAdminToken}`) {
      throw unauthorized();
    }

    await next();
  };
}
