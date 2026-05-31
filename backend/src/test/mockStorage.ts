import type { ObjectHead, ObjectStorage, PutObjectInput, SignedUrlInput } from "../infra/storage.js";

export class MockStorage implements ObjectStorage {
  readonly objects = new Map<string, { body: string | Uint8Array; contentType: string }>();

  async getObjectText(key: string) {
    const object = this.objects.get(key);
    if (!object) {
      throw new Error(`Not found: ${key}`);
    }

    return typeof object.body === "string" ? object.body : new TextDecoder().decode(object.body);
  }

  async putObject(input: PutObjectInput) {
    this.objects.set(input.key, {
      body: input.body,
      contentType: input.contentType
    });
  }

  async headObject(key: string): Promise<ObjectHead> {
    const object = this.objects.get(key);
    if (!object) {
      throw new Error(`Not found: ${key}`);
    }

    return {
      contentLength: typeof object.body === "string" ? new TextEncoder().encode(object.body).byteLength : object.body.length
    };
  }

  async listObjects(prefix: string) {
    return [...this.objects.keys()].filter((key) => key.startsWith(prefix)).sort();
  }

  async createSignedPutUrl(input: SignedUrlInput) {
    return `https://upload.example.test/${encodeURIComponent(input.key)}`;
  }

  async createSignedGetUrl(input: SignedUrlInput) {
    return `https://download.example.test/${encodeURIComponent(input.key)}`;
  }
}
