import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ["./tsconfig.vitest.json"] }), react()],
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "test/mocks/server-only.ts"),
      "next/server": path.resolve(__dirname, "node_modules/next/server.js"),
    },
  },
  test: {
    globals: true,
    restoreMocks: true,
    unstubEnvs: true,
    // SurveyJS Creator and renderer tests can pass 5 s on a cold cache with coverage on.
    testTimeout: 15_000,
    server: {
      deps: {
        inline: ["next-auth"],
      },
    },
    exclude: [...configDefaults.exclude, "e2e/**", "**/.*/worktrees/**"],
    coverage: {
      include: [
        "app/**/*.{ts,tsx}",
        "components/**/*.tsx",
        "extensions/**/*.ts",
        "features/**/*.ts",
        "lib/**/*.{ts,tsx}",
        "types/**/*.ts",
        "src/**/*.ts",
      ],
      exclude: [
        "**/*.d.ts",
        "**/index.ts",
        "**/server.ts",
        "**/*.server.ts",
        "**/client.ts",
        "**/__tests__/**",
        "components/ui/**/*.tsx",
      ],
      // Off by default so `pnpm test` and watch mode skip v8 instrumentation.
      // `pnpm test:coverage` and the CI shards turn it on with `--coverage`.
      provider: "v8",
      reporter: process.env.GITHUB_ACTIONS
        ? ["cobertura", "json", "json-summary", "lcovonly"]
        : ["cobertura", "html"],
      reportsDirectory: ".coverage/endatix-hub",
    },
    reporters: process.env.GITHUB_ACTIONS ? ["dot", "github-actions"] : ["dot"],
    // `.test.ts` runs in node; `.test.tsx` runs in jsdom. A `.ts` test that needs the
    // DOM starts with `// @vitest-environment jsdom`. Measurements: endatix-hub#1317.
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          pool: "threads",
          include: ["**/*.test.ts"],
        },
      },
      {
        test: {
          name: "dom",
          environment: "jsdom",
          // One jsdom per worker instead of per file; each file still gets its own context.
          pool: "vmForks",
          include: ["**/*.test.tsx"],
          deps: {
            // CJS that require()s ESM-only htmlparser2, which a vm context cannot load.
            optimizer: {
              client: { enabled: true, include: ["sanitize-html"] },
            },
          },
        },
      },
    ],
  },
});
