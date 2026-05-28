import path from "node:path";

export type Env = {
  port: number;
  awsRegion: string;
  slidesBucketName: string;
  slidesPrefix: string;
  s3PublicBaseUrl?: string;
  uploadAdminToken?: string;
  uploadMaxFileSize: number;
  uploadMaxDeckSize: number;
  ogpDefaultImageUrl?: string;
  frontendDistDir: string;
};

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return {
    port: readNumber(source.PORT, 3000),
    awsRegion: source.AWS_REGION || "ap-northeast-1",
    slidesBucketName: source.SLIDES_BUCKET_NAME || source.VITE_S3_BUCKET_NAME || "",
    slidesPrefix: source.SLIDES_PREFIX || source.VITE_S3_PREFIX || "decks",
    s3PublicBaseUrl: trimTrailingSlash(source.S3_PUBLIC_BASE_URL || source.VITE_S3_PUBLIC_BASE_URL),
    uploadAdminToken: source.UPLOAD_ADMIN_TOKEN,
    uploadMaxFileSize: readMegabytes(source.UPLOAD_MAX_FILE_SIZE_MB, 20),
    uploadMaxDeckSize: readMegabytes(source.UPLOAD_MAX_DECK_SIZE_MB, 200),
    ogpDefaultImageUrl: source.OGP_DEFAULT_IMAGE_URL,
    frontendDistDir: path.resolve(process.cwd(), source.FRONTEND_DIST_DIR || "../frontend/dist")
  };
}

function readMegabytes(value: string | undefined, fallback: number) {
  return readNumber(value, fallback) * 1024 * 1024;
}

function readNumber(value: string | undefined, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function trimTrailingSlash(value?: string) {
  return value?.replace(/\/+$/, "");
}
