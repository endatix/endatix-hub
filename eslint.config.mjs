import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  // import.meta.dirname is available after Node.js v20.11.0
  baseDirectory: __dirname,
});

const project = resolve(__dirname, "tsconfig.json");

// Test file patterns
const testFiles = [
  "**/__tests__/**/*.[jt]s?(x)",
  "**/?(*.)+(spec|test).[jt]s?(x)",
];

const tempRuleOverrides =  {
  "no-console": "off",
  "@typescript-eslint/no-unused-vars": "off",
  "@typescript-eslint/no-explicit-any": "off",
};

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  // 1. Base ignores (replaces .eslintignore)
  {
    ignores: [
      "**/node_modules/",
      "**/.next/",
      "**/public/",
      "**/playwright/",
      "**/dist/",
      "**/coverage/",
      "**/.coverage/",
      "**/vendor/",
      "**/docs/",
      "**/examples/",
      "**/package.json",
      "**/tsconfig.json",
      "next-env.d.ts",
    ],
  },

  // 2. Next.js & TypeScript recommended rules (following Next.js 15 docs)
  ...compat.config({
    extends: ["next/core-web-vitals", "next/typescript"],
  }),

  // 3. Global rules & overrides
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      quotes: ["error", "double", { avoidEscape: true }],
      "jsx-quotes": ["error", "prefer-double"],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "no-console": ["warn", { allow: ["warn", "error", "debug"] }],
      ...tempRuleOverrides,
    },
  },

  // 4. Testing Library rules for test files only
  {
    files: testFiles,
    ...compat.config({
      extends: ["plugin:testing-library/react"],
    })[0],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "testing-library/no-unnecessary-act": "off",
    },
  },

  // 5. E2E specific overrides (preserving existing logic)
  {
    files: ["e2e/**/*.ts", "e2e/**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project,
      },
    },
    rules: {
      "testing-library/prefer-screen-queries": "off",
      "@typescript-eslint/no-floating-promises": "error",
    },
  },

  // 6. Prettier integration (Must be last to override other formatting rules)
  ...compat.config({
    extends: ["prettier"],
  }),
];

export default eslintConfig;
