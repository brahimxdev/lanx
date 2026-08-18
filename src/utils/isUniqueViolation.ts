interface DatabaseErrorLike {
  code: string;
  constraint?: string;
}

const isDatabaseErrorLike = (value: unknown): value is DatabaseErrorLike =>
  typeof value === "object" &&
  value !== null &&
  "code" in value &&
  typeof (value as Record<string, unknown>).code === "string";

const getCause = (err: unknown): unknown =>
  typeof err === "object" && err !== null && "cause" in err
    ? (err as Record<string, unknown>).cause
    : undefined;

// Drizzle wraps the real pg error in .cause, so check both.
export const isUniqueViolation = (err: unknown): boolean => {
  const cause = getCause(err);
  const candidate = isDatabaseErrorLike(err) ? err : isDatabaseErrorLike(cause) ? cause : undefined;

  return candidate?.code === "23505";
};
