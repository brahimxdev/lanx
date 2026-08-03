import { storageConfig } from "@/config/index.js";
import { r2Client } from "@/lib/r2.client.js";
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const PRESIGNED_URL_TTL_SECONDS = 5 * 60;

export class StorageService {
  // Shared
  private async safeDelete(bucket: string, key: string): Promise<void> {
    try {
      await r2Client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );
    } catch (error) {
      console.error("Failed to delete R2 object", { bucket, key, error });
    }
  }

  // Public bucket
  async uploadPublic(key: string, body: Buffer, contentType: string): Promise<string> {
    await r2Client.send(
      new PutObjectCommand({
        Bucket: storageConfig.r2PublicBucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    return `${storageConfig.r2PublicBaseUrl}/${key}`;
  }

  async deletePublic(keyorUrl: string): Promise<void> {
    const key = keyorUrl.startsWith(storageConfig.r2PublicBaseUrl)
      ? keyorUrl.slice(storageConfig.r2PublicBaseUrl.length + 1)
      : keyorUrl;
    await this.safeDelete(storageConfig.r2PublicBucketName, key);
    console.log(key);
  }

  // Private bucket
  async uploadPrivate(key: string, body: Buffer, contentType: string): Promise<string> {
    await r2Client.send(
      new PutObjectCommand({
        Bucket: storageConfig.r2PrivateBucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
    return key;
  }

  async getPrivateReadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: storageConfig.r2PrivateBucketName,
      Key: key,
    });
    return getSignedUrl(r2Client, command, { expiresIn: PRESIGNED_URL_TTL_SECONDS });
  }

  async deletePrivate(key: string): Promise<void> {
    await this.safeDelete(storageConfig.r2PrivateBucketName, key);
  }
}

export const storageService = new StorageService();
