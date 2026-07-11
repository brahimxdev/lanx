import js from "@eslint/js";
import tseslint from "typescript-eslint";
import vitest from "@vitest/eslint-plugin";

// eslint-disable-next-line @typescript-eslint/no-deprecated
export default tseslint.config(
  // 1. Ignore build output
  {
    ignores: ["dist", "node_modules", "coverage"],
  },

  // 2. Base JS rules
  js.configs.recommended,

  // 3. TypeScript strict rules (type-aware)
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // 4. Project-wide TS config
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.config.js", "*.config.ts"],
          defaultProject: "tsconfig.eslint.json",
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // 5. Rule overrides for backend realities
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "no-console": "off",
      "no-debugger": "error",
      eqeqeq: ["error", "always"],
    },
  },

  // 6. Vitest rules — scoped to test files only
  {
    files: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
    },
    settings: {
      vitest: { typecheck: true },
    },
    languageOptions: {
      globals: vitest.environments.env.globals,
    },
  }
);
