import { S3Client } from "@aws-sdk/client-s3";
import { storageConfig } from "@/config/index.js";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: storageConfig.r2AccountId,
  credentials: {
    accessKeyId: storageConfig.r2AccessKeyId,
    secretAccessKey: storageConfig.r2SecretAccessKey,
  },
});
