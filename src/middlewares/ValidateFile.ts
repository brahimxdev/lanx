import type { Request, Response, NextFunction } from "express";
import { fileTypeFromBuffer } from "file-type";

import { AppError, ErrorCode } from "@/errors/index.js";
import { storageConfig } from "@/config/index.js";

interface IFileValidatorOptions {
  allowedMimeTypes: readonly string[];
  maxSizeBytes: number;
  maxSizeLabel: string;
}

const createFileValidator = ({
  allowedMimeTypes,
  maxSizeBytes,
  maxSizeLabel,
}: IFileValidatorOptions) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    void (async () => {
      const file = req.file;

      if (!file) {
        next(AppError.badRequest("No file provided.", ErrorCode.VALIDATION_ERROR));
        return;
      }

      const { mimetype: claimedMimeType, size: fileSize, buffer: fileBuffer } = file;

      if (!allowedMimeTypes.includes(claimedMimeType)) {
        next(
          AppError.badRequest(
            `Invalid file type "${claimedMimeType}". Allowed types: ${allowedMimeTypes.join(", ")}.`,
            ErrorCode.VALIDATION_ERROR
          )
        );
        return;
      }

      if (fileSize > maxSizeBytes) {
        next(
          AppError.badRequest(
            `File exceeds the maximum allowed size of ${maxSizeLabel}.`,
            ErrorCode.VALIDATION_ERROR
          )
        );
        return;
      }

      if (fileBuffer.length === 0) {
        next(AppError.badRequest("File buffer is empty.", ErrorCode.VALIDATION_ERROR));
        return;
      }

      const detected = await fileTypeFromBuffer(fileBuffer);

      if (!detected || !allowedMimeTypes.includes(detected.mime)) {
        next(
          AppError.badRequest(
            "File content does not match a supported file type.",
            ErrorCode.VALIDATION_ERROR
          )
        );
        return;
      }

      if (detected.mime !== claimedMimeType) {
        next(
          AppError.badRequest(
            "File content does not match its declared type.",
            ErrorCode.VALIDATION_ERROR
          )
        );
        return;
      }

      next();
    })().catch(next);
  };
};

export const validateImageFile = createFileValidator({
  allowedMimeTypes: storageConfig.imageFileTypes,
  maxSizeBytes: storageConfig.imageFileMaxSize,
  maxSizeLabel: storageConfig.imageFileMaxSizeLabel,
});

export const validateDocumentFile = createFileValidator({
  allowedMimeTypes: storageConfig.documentFileTypes,
  maxSizeBytes: storageConfig.documentFileMaxSize,
  maxSizeLabel: storageConfig.documentFileMaxSizeLabel,
});
