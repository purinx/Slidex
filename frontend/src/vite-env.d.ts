/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_DEFAULT_DECK_ID?: string;
  readonly VITE_S3_PUBLIC_BASE_URL?: string;
  readonly VITE_SLIDES_DIR?: string;
  readonly VITE_UPLOAD_MAX_DECK_SIZE_MB?: string;
  readonly VITE_UPLOAD_MAX_FILE_SIZE_MB?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
