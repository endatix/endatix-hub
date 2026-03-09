import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier/flat";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const project = resolve(__dirname, "tsconfig.json");

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

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "**/node_modules/",
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
  ]),
  {
    settings: {
      react: { version: "19" },
    },
  },
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
  {
    files: ["e2e/**/*.ts", "e2e/**/*.tsx"],
    languageOptions: {
      parserOptions: { project },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
  prettierConfig,
]);

export default eslintConfig;
