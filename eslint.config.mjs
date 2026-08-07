import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier/flat";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const e2eProject = resolve(__dirname, "tsconfig.e2e.json");

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
    "**/playwright-report/",
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
    files: ["features/asset-storage/infrastructure/core/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../providers/*",
                "../providers/**",
                "@endatix/storage-azure",
                "@endatix/storage-s3",
                "next",
                "next/*",
                "react",
                "react/*",
                "@/*",
              ],
              message:
                "storage-core must stay provider-agnostic and framework-free for package extraction.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "features/asset-storage/infrastructure/providers/azure/**/*.ts",
      "features/asset-storage/infrastructure/providers/s3/**/*.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../azure/*",
                "../azure/**",
                "../s3/*",
                "../s3/**",
                "@endatix/storage-azure",
                "@endatix/storage-s3",
              ],
              message:
                "storage providers must not depend on each other; compose them only in bootstrap.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["e2e/**/*.ts", "e2e/**/*.tsx"],
    languageOptions: {
      parserOptions: { project: e2eProject },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
  prettierConfig,
]);

export default eslintConfig;
