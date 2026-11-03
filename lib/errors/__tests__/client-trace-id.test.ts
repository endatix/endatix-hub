import { afterEach, describe, expect, it, vi } from "vitest";
import { trace } from "@opentelemetry/api";
import { withClientTraceId } from "@/lib/errors/unexpected-error-ui";

const ACTIVE_TRACE = "4bf92f3577b34da6a3ce929d0e0e4736";
const MINTED = "0b0e3d64-0c3f-4b9a-9f39-5c1c8e8c2b11";

function activeSpan(traceId: string) {
  vi.spyOn(trace, "getActiveSpan").mockReturnValue({
    spanContext: () => ({ traceId, spanId: "00f067aa0ba902b7", traceFlags: 1 }),
  } as unknown as ReturnType<typeof trace.getActiveSpan>);
}

describe("withClientTraceId", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mints an id for a client error that has no digest and no trace id", () => {
    // Arrange
    vi.spyOn(crypto, "randomUUID").mockReturnValue(MINTED);

    // Act
    const diagnostics = withClientTraceId({});

    // Assert
    expect(diagnostics.traceId).toBe(MINTED);
  });

  it("uses the active trace when telemetry is running", () => {
    // Arrange
    activeSpan(ACTIVE_TRACE);

    // Act
    const diagnostics = withClientTraceId({ statusCode: 500 });

    // Assert
    expect(diagnostics).toEqual({ statusCode: 500, traceId: ACTIVE_TRACE });
  });

  it("ignores OpenTelemetry's all-zero no-trace id", () => {
    // Arrange
    activeSpan("00000000000000000000000000000000");
    vi.spyOn(crypto, "randomUUID").mockReturnValue(MINTED);

    // Act
    const diagnostics = withClientTraceId({});

    // Assert
    expect(diagnostics.traceId).toBe(MINTED);
  });

  it.each([
    ["a server digest", { digest: "3804550175" }],
    ["an API trace id", { traceId: "api-trace-1234" }],
  ])("keeps %s and mints nothing", (_label, given) => {
    // Arrange
    const randomUUID = vi.spyOn(crypto, "randomUUID");

    // Act
    const diagnostics = withClientTraceId(given);

    // Assert
    expect(diagnostics).toEqual(given);
    expect(randomUUID).not.toHaveBeenCalled();
  });

  /** `crypto.randomUUID` exists only in secure contexts; a Hub served over http has none. */
  it("leaves the trace id blank when the page cannot mint one", () => {
    // Arrange
    vi.stubGlobal("crypto", {});

    // Act
    const diagnostics = withClientTraceId({});

    // Assert
    expect(diagnostics).toEqual({});
    vi.unstubAllGlobals();
  });
});
