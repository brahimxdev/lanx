import type { IAuthenticatedUser } from "@/modules/auth/auth.types.js";

declare global {
  namespace Express {
    interface Request {
      user?: IAuthenticatedUser;
      sessionId?: string;
      deviceId: string;
      validated?: {
        body: unknown;
        query: unknown;
        params: unknown;
      };
      file?: UploadedFile;
    }

    interface UploadedFile {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      buffer: Buffer;
      size: number;
    }
  }
}

export {};
