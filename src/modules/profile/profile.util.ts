import { AppError, ErrorCode } from "@/errors/index.js";

interface DatabaseErrorLike {
  code: string;
  constraint?: string;
}

const isDatabaseErrorLike = (value: unknown): value is DatabaseErrorLike => {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof (value as Record<string, unknown>).code === "string"
  );
};

const getCause = (err: unknown): unknown => {
  if (typeof err !== "object" || err === null || !("cause" in err)) {
    return undefined;
  }
  return err.cause;
};

// Map each FK constraint name to a field-specific, user-facing message.
const FK_CONSTRAINT_MESSAGES: Record<string, string> = {
  profiles_currency_code_currencies_code_fkey: "Selected currency is invalid",
  profiles_country_code_countries_code_fkey: "Selected country is invalid",
  profiles_profession_id_professions_id_fkey: "Selected profession is invalid",
};

export const mapForeignKeyError = (err: unknown): never => {
  // Drizzle wraps the real pg error in .cause, so check both.
  const cause = getCause(err);
  const candidate = isDatabaseErrorLike(err) ? err : isDatabaseErrorLike(cause) ? cause : undefined;

  if (candidate?.code === "23503") {
    const message =
      (candidate.constraint && FK_CONSTRAINT_MESSAGES[candidate.constraint]) ??
      "One or more selected values (profession, country, or currency) is invalid";

    throw AppError.badRequest(message, ErrorCode.INVALID_REFERENCE);
  }

  if (candidate?.code === "23505") {
    throw AppError.conflict(
      "Profile already exist, if you're looking to edit, please edit in dashboard",
      ErrorCode.ALREADY_EXISTS
    );
  }

  throw err;
};
