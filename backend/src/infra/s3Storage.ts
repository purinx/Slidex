import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ObjectStorage, PutObjectInput, SignedUrlInput } from "./storage.js";

export function createS3Storage(input: { bucket: string; region: string; clientConfig?: S3ClientConfig }) {
  const client = new S3Client({
    region: input.region,
    ...input.clientConfig
  });

  return new S3ObjectStorage(client, input.bucket);
}

export class S3ObjectStorage implements ObjectStorage {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string
  ) {}

  async getObjectText(key: string) {
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      })
    );

    return result.Body?.transformToString() ?? "";
  }

  async putObject(input: PutObjectInput) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType
      })
    );
  }

  async headObject(key: string) {
    const result = await this.client.send(
      new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key
      })
    );

    return {
      contentLength: result.ContentLength
    };
  }

  async createSignedPutUrl(input: SignedUrlInput) {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        ContentType: input.contentType
      }),
      { expiresIn: input.expiresInSeconds }
    );
  }

  async createSignedGetUrl(input: SignedUrlInput) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: input.key
      }),
      { expiresIn: input.expiresInSeconds }
    );
  }
}
