import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier/flat";
import unicorn from "eslint-plugin-unicorn";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const e2eProject = resolve(__dirname, "tsconfig.e2e.json");

const tempRuleOverrides = {
  "no-console": "off",
  "@typescript-eslint/no-explicit-any": "off",
  "react-hooks/set-state-in-effect": "off",
  "react-hooks/incompatible-library": "off",
  "react-hooks/immutability": "off",
  "react-hooks/static-components": "off",
  "react-hooks/purity": "off",
  "react-hooks/globals": "off",
  "react-hooks/refs": "off",
};

// A later no-restricted-imports block replaces the rule's options for its files, so every block
// spreads this pattern in too.
const authoringIndexOnly = {
  group: [
    "@/lib/personalization/authoring/*",
    "**/personalization/authoring/*",
    "@/lib/personalization/coverage/*",
    "**/personalization/coverage/*",
    "!@/lib/personalization/coverage/audience-usage",
  ],
  message:
    "Import Audience authoring from @/lib/personalization/authoring (client), or the Creator-free @/lib/personalization/coverage (server-safe), through their index.ts only. Browser code that needs only the verdicts imports @/lib/personalization/coverage/audience-usage, which leaves the linter out of the bundle.",
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
    "**/.*/worktrees/**",
  ]),
  {
    settings: {
      react: { version: "19" },
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: { unicorn },
    rules: {
      quotes: ["error", "double", { avoidEscape: true }],
      "jsx-quotes": ["error", "prefer-double"],
      // SonarCloud S1128 (unused import, `import type` included) and its unused-variable siblings.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      "no-console": ["warn", { allow: ["warn", "error", "debug"] }],
      // SonarCloud S7727: pass a callback, not a function reference, to array methods.
      "unicorn/no-array-callback-reference": "error",
      ...tempRuleOverrides,
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: [
      "lib/personalization/authoring/**",
      "lib/personalization/coverage/**",
    ],
    rules: {
      "no-restricted-imports": ["error", { patterns: [authoringIndexOnly] }],
    },
  },
  {
    files: ["features/asset-storage/infrastructure/core/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            authoringIndexOnly,
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
    files: ["src/embed/**/*.ts", "features/embed-form/embed-query-params.ts"],
    ignores: ["src/embed/**/*.test.ts", "src/embed/__tests__/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            authoringIndexOnly,
            {
              group: ["next", "next/*", "react", "react/*", "@/*"],
              message:
                "embed.js is a standalone esbuild IIFE: no framework or @/ imports. Share constants via a relative import of features/embed-form/embed-query-params.ts.",
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
            authoringIndexOnly,
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
