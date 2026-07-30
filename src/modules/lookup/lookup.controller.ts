import type { TypedRequest, TypedQueryRequest } from "@/types/typed-request.js";
import type { LookupService } from "./lookup.service.js";
import type { IAuthenticatedUser } from "../auth/index.js";
import { AppError, ErrorCode, HttpStatus } from "@/errors/index.js";
import type { Response } from "express";
import type {
  IListCountriesQuery,
  IListCurrenciesQuery,
  IListProfessionsQuery,
} from "./lookup.validation.js";

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
  listCountries = async (req: TypedQueryRequest<IListCountriesQuery>, res: Response) => {
    //* Validation middleware already validated data!

    const { search } = req.validated.query;
    // Service layer to handle logic
    const { countries } = await this.lookupService.getCountries({ search });

    res.status(HttpStatus.OK).json({
      status: true,
      data: countries,
    });
  };

  // list all currencies
  listCurrencies = async (req: TypedQueryRequest<IListCurrenciesQuery>, res: Response) => {
    const { search } = req.validated.query;
    // Service layer to handle logic
    const { currencies } = await this.lookupService.getCurrencies({ search });

    res.status(HttpStatus.OK).json({
      status: true,
      data: currencies,
    });
  };

  // list all professions by default or search query
  listProfessions = async (req: TypedQueryRequest<IListProfessionsQuery>, res: Response) => {
    //* Validation middleware already validated data!

    const { search, limit, page } = req.validated.query;

    // Service layer to handle logic
    const { professions } = await this.lookupService.getProfessions({ search, limit, page });

    res.status(HttpStatus.OK).json({
      status: true,
      data: professions,
    });
  };
}
