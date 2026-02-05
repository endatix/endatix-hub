import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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

const tempRuleOverrides = {
  "no-console": "off",
  "@typescript-eslint/no-unused-vars": "off",
  "@typescript-eslint/no-explicit-any": "off",
  "react-hooks/set-state-in-effect": "off",
  "react-hooks/incompatible-library": "off",
  "react-hooks/immutability": "off",
  "react-hooks/static-components": "off",
  "react-hooks/purity": "off",
  "react-hooks/globals": "off",
  "react-hooks/refs": "off",
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
  ...nextCoreWebVitals,
  ...nextTypescript, // 3. Global rules & overrides
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
  }, // 4. Testing Library rules for test files only
  {
    files: testFiles,
    ...compat.config({
      extends: ["plugin:testing-library/react"],
    })[0],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "testing-library/no-unnecessary-act": "off",
    },
  }, // 5. E2E specific overrides (preserving existing logic)
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
  ...compat.config({
    extends: ["prettier"],
  }),
];

export default eslintConfig;
