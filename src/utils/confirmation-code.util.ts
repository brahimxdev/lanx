import { randomInt, createHash } from "crypto";

const CODE_LENGTH = 6;
const MIN = 10 ** (CODE_LENGTH - 1);
const MAX = 10 ** CODE_LENGTH;

// Generate a cryptgraphically secure 6-digit numeric code
export const generateConfirmationCode = (): string => {
  const code = randomInt(MIN, MAX);
  const stringCode = code.toString().padStart(CODE_LENGTH, "0");
  return stringCode;
};

// Hashes a code for DB storage (codeHash column).
export const hashConfirmationCode = (code: string): string => {
  const hashedCode = createHash("sha256").update(code).digest("hex");
  return hashedCode;
};

// Compares a plaintext code against a stored hash.
export const verifyConfirmationCode = (code: string, hashedCode: string): boolean => {
  const isPlainEqualHashed = hashConfirmationCode(code) === hashedCode;
  return isPlainEqualHashed;
};

// const code = generateConfirmationCode();
// console.log("Your code is:", code);

// const hashedCode = hashConfirmationCode(code);
// console.log("Your hashed code is:", hashedCode);

// const isPlainEqualHashed = verifyConfirmationCode(code, hashedCode);
// console.log("Is plain equal hash?", isPlainEqualHashed);
