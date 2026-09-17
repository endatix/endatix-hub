import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { OTEL_SERVER_EXTERNAL_PACKAGES } from "../infrastructure/otel-server-externals";

const INFRASTRUCTURE_DIR = path.resolve(__dirname, "../infrastructure");
const TELEMETRY_IMPORT =
  /from\s+['"]((?:@opentelemetry|@azure)\/[^'"]+)['"]/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(fullPath);
    return entry.name.endsWith(".ts") ? [fullPath] : [];
  });
}

function importedTelemetryPackages(): string[] {
  const packages = sourceFiles(INFRASTRUCTURE_DIR).flatMap((file) =>
    [...readFileSync(file, "utf8").matchAll(TELEMETRY_IMPORT)].map(
      (match) => match[1],
    ),
  );
  return [...new Set(packages)].sort();
}

describe("OTEL_SERVER_EXTERNAL_PACKAGES", () => {
  it("lists every OpenTelemetry and Azure package the telemetry module imports", () => {
    // Arrange
    const imported = importedTelemetryPackages();

    // Act
    const missing = imported.filter(
      (pkg) =>
        !(OTEL_SERVER_EXTERNAL_PACKAGES as readonly string[]).includes(pkg),
    );

    // Assert
    expect(imported).toContain("@opentelemetry/api-logs");
    expect(missing).toEqual([]);
  });

  it("is wired into next.config.ts", () => {
    // Arrange
    const config = readFileSync(
      path.resolve(__dirname, "../../../next.config.ts"),
      "utf8",
    );

    // Act & Assert
    expect(config).toMatch(
      /serverExternalPackages[\s\S]*OTEL_SERVER_EXTERNAL_PACKAGES/,
    );
  });
});
