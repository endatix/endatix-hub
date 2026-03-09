import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    globals: true,
    environment: "jsdom",
    exclude: [...configDefaults.exclude, "e2e/**"],
    coverage: {
      include: [
        "app/**/*.{ts,tsx}",
        "components/**/*.tsx",
        "extensions/**/*.ts",
        "features/**/*.ts",
        "lib/**/*.{ts,tsx}",
        "types/**/*.ts",
      ],
      exclude: [
        "**/*.d.ts",
        "**/index.ts",
        "**/server.ts",
        "**/client.ts",
        "**/__tests__/**",
        "components/ui/**/*.tsx",
      ],
      enabled: true,
      provider: "v8",
      reporter: process.env.GITHUB_ACTIONS
        ? ["cobertura", "json", "json-summary"]
        : ["cobertura", "html"],
      reportsDirectory: ".coverage/endatix-hub",
    },
    reporters: process.env.GITHUB_ACTIONS ? ["dot", "github-actions"] : ["dot"],
  },
});
