import multer from "multer";
import type { Request, Response, NextFunction } from "express";
import { AppError, ErrorCode } from "@/errors/index.js";

interface ICreateSingleUploadOptions {
  fieldName: string;
  allowedMimeTypes: readonly string[];
  maxSizeBytes: number;
  maxSizeLabel: string; // human-readable, used in error messages for this field only
}

export const createSingleUpload = ({
  fieldName,
  allowedMimeTypes,
  maxSizeBytes,
  maxSizeLabel,
}: ICreateSingleUploadOptions) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxSizeBytes,
      files: 1,
    },

    fileFilter: (_req, file, callback) => {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        callback(
          AppError.badRequest(
            `Invalid file type "${file.mimetype}". Allowed types: ${allowedMimeTypes.join(", ")}.`,
            ErrorCode.VALIDATION_ERROR
          )
        );
        return;
      }
      callback(null, true);
    },
  }).single(fieldName);

  return (req: Request, res: Response, next: NextFunction): void => {
    upload(req, res, (err: unknown) => {
      if (!err) {
        next();
        return;
      }

      if (err instanceof multer.MulterError) {
        next(mapMulterError(err, maxSizeLabel));
        return;
      }

      // Errors thrown from fileFilter (already AppError) or anything else unexpected.
      next(err);
    });
  };
};

export const mapMulterError = (err: multer.MulterError, maxSizeLabel: string): AppError => {
  switch (err.code) {
    case "LIMIT_FILE_SIZE":
      return AppError.badRequest(
        `File exceeds the maximum allowed size of ${maxSizeLabel}.`,
        ErrorCode.VALIDATION_ERROR
      );
    case "LIMIT_UNEXPECTED_FILE":
      return AppError.badRequest(
        `Unexpected file field "${err.field ?? "unknown"}".`,
        ErrorCode.VALIDATION_ERROR
      );
    case "LIMIT_FILE_COUNT":
      return AppError.badRequest("Too many files uploaded.", ErrorCode.VALIDATION_ERROR);
    case "LIMIT_FIELD_COUNT":
    case "LIMIT_FIELD_KEY":
    case "LIMIT_FIELD_VALUE":
    case "LIMIT_PART_COUNT":
      return AppError.badRequest("Form data exceeds allowed limits.", ErrorCode.VALIDATION_ERROR);
    default:
      return AppError.badRequest(err.message, ErrorCode.VALIDATION_ERROR);
  }
};
