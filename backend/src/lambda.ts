import { handle } from "hono/aws-lambda";
import { createApp } from "./app.js";
import { readEnv } from "./infra/env.js";
import { createS3Storage } from "./infra/s3Storage.js";

const env = readEnv();
const storage = createS3Storage({
  bucket: env.slidesBucketName,
  region: env.awsRegion
});
const app = createApp({ env, storage });

export const handler = handle(app);
