import { expect, test, describe } from "vitest";
import { sumNumbers } from "@/utils/sumNumbers.js";

describe("sumNumbers function", () => {
  test("Should add two positive numbers correctly", () => {
    expect(sumNumbers(1, 4)).toBe(5);
  });
});
