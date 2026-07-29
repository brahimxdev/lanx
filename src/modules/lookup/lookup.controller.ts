import type { TypedRequest } from "@/types/typed-request.js";
import type { LookupService } from "./lookup.service.js";
import type { IAuthenticatedUser } from "../auth/index.js";
import { AppError, ErrorCode, HttpStatus } from "@/errors/index.js";
import type { Response } from "express";

export class LookupController {
  constructor(private readonly lookupService: LookupService) {}

  private assertUser(
    req: TypedRequest
  ): asserts req is TypedRequest & { user: IAuthenticatedUser } {
    if (!req.user) {
      throw AppError.unauthorized("Authentication required", ErrorCode.UNAUTHORIZED);
    }
  }

  // list all countries
  listCountries = async (req: TypedRequest, res: Response) => {
    // Service layer to handle logic
    const { countries } = await this.lookupService.getCountries();

    res.status(HttpStatus.OK).json({
      status: true,
      data: countries,
    });
  };
}
