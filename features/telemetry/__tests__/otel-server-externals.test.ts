import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { OTEL_SERVER_EXTERNAL_PACKAGES } from "../infrastructure/otel-server-externals";

describe("OTEL_SERVER_EXTERNAL_PACKAGES", () => {
  it("includes api-logs so TelemetryLogger shares the LoggerProvider", () => {
    // Act & Assert
    expect(OTEL_SERVER_EXTERNAL_PACKAGES).toContain("@opentelemetry/api-logs");
    expect(OTEL_SERVER_EXTERNAL_PACKAGES).toContain(
      "@azure/monitor-opentelemetry-exporter",
    );
  });

  it("is wired into next.config.ts", () => {
    // Arrange
    const config = readFileSync(
      path.resolve(__dirname, "../../../next.config.ts"),
      "utf8",
    );

    // Act & Assert
    expect(config).toContain("serverExternalPackages");
    expect(config).toContain("OTEL_SERVER_EXTERNAL_PACKAGES");
  });
});
