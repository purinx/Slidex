export type PutObjectInput = {
  key: string;
  body: string | Uint8Array;
  contentType: string;
};

export type ObjectHead = {
  contentLength?: number;
};

export type SignedUrlInput = {
  key: string;
  contentType?: string;
  expiresInSeconds: number;
};

export type ObjectStorage = {
  getObjectText(key: string): Promise<string>;
  putObject(input: PutObjectInput): Promise<void>;
  headObject(key: string): Promise<ObjectHead>;
  createSignedPutUrl(input: SignedUrlInput): Promise<string>;
  createSignedGetUrl(input: SignedUrlInput): Promise<string>;
};
