import { serve } from "@hono/node-server";
import { readEnv } from "./infra/env.js";
import { createS3Storage } from "./infra/s3Storage.js";
import { createApp } from "./app.js";

const env = readEnv();
const storage = createS3Storage({
  bucket: env.slidesBucketName,
  region: env.awsRegion
});
const app = createApp({ env, storage });

serve(
  {
    fetch: app.fetch,
    port: env.port
  },
  (info) => {
    console.log(`SlideX backend listening on http://127.0.0.1:${info.port}`);
  }
);
