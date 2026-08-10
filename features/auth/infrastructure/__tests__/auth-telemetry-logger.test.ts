import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { authTelemetryLogger } from "../auth-telemetry-logger";
import { TelemetryLogger } from "@/features/telemetry";

describe("authTelemetryLogger", () => {
  beforeEach(() => {
    vi.spyOn(TelemetryLogger, "error").mockImplementation(() => {});
    vi.spyOn(TelemetryLogger, "warn").mockImplementation(() => {});
    vi.spyOn(TelemetryLogger, "debug").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("forwards auth errors to telemetry", () => {
    // Arrange
    // Auth.js logs through its own console-only logger, so authentication failures never
    // reached an OTLP exporter before this bridge existed.
    const error = new Error("Network");
    error.name = "AuthError";

    // Act
    authTelemetryLogger.error?.(error);

    // Assert
    expect(TelemetryLogger.error).toHaveBeenCalledWith(
      "Auth error: Network",
      error,
      { "auth.error.name": "AuthError" },
      "auth",
    );
  });

  it("keeps auth errors on the console as well as in telemetry", () => {
    // Arrange
    // TelemetryLogger suppresses its console fallback whenever an exporter is configured, so
    // forwarding alone would remove [auth] lines from `docker logs` on exactly the
    // deployments that enable telemetry.
    const error = new Error("Network");

    // Act
    authTelemetryLogger.error?.(error);

    // Assert
    expect(console.error).toHaveBeenCalledWith("[auth][error] Network");
  });

  it("forwards auth warnings to telemetry", () => {
    // Act
    authTelemetryLogger.warn?.("debug-enabled");

    // Assert
    expect(TelemetryLogger.warn).toHaveBeenCalledWith(
      "Auth warning: debug-enabled",
      { "auth.warning.code": "debug-enabled" },
      "auth",
    );
    expect(console.warn).toHaveBeenCalledWith("[auth][warn] debug-enabled");
  });

  it("emits auth debug at debug severity so backends drop it by default", () => {
    // Arrange
    // Auth.js debug output is extremely chatty and only fires when debug: true. Emitting it
    // at a higher severity would mean paying to ingest it.

    // Act
    authTelemetryLogger.debug?.("callback invoked", { provider: "endatix" });

    // Assert
    expect(TelemetryLogger.debug).toHaveBeenCalled();
    expect(TelemetryLogger.error).not.toHaveBeenCalled();
    expect(TelemetryLogger.warn).not.toHaveBeenCalled();
  });

  it("does not throw when Auth.js passes a malformed error", () => {
    // Arrange
    // A logger that throws inside the auth flow would turn a recoverable auth failure into a
    // request crash, so this must degrade rather than propagate.

    // Act
    const act = () =>
      authTelemetryLogger.error?.(undefined as unknown as Error);

    // Assert
    expect(act).not.toThrow();
    expect(TelemetryLogger.error).toHaveBeenCalled();
  });
});
