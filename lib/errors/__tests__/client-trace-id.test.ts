import { afterEach, describe, expect, it, vi } from "vitest";
import { withClientTraceId } from "@/lib/errors/unexpected-error-ui";

const MINTED = "0b0e3d64-0c3f-4b9a-9f39-5c1c8e8c2b11";

describe("withClientTraceId", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("mints an id for a client error that has no digest and no trace id", () => {
    // Arrange
    vi.spyOn(crypto, "randomUUID").mockReturnValue(MINTED);

    // Act
    const diagnostics = withClientTraceId(
      { statusCode: 500 },
      new Error("boom"),
    );

    // Assert
    expect(diagnostics).toEqual({ statusCode: 500, traceId: MINTED });
  });

  it("gives one error the same id every time, and another error its own", () => {
    // Arrange
    const error = new Error("boom");

    // Act
    const first = withClientTraceId({}, error).traceId;
    const again = withClientTraceId({}, error).traceId;
    const other = withClientTraceId({}, new Error("boom")).traceId;

    // Assert
    expect(again).toBe(first);
    expect(other).not.toBe(first);
  });

  /** `crypto.randomUUID` exists only in secure contexts; a Hub served over http has none. */
  it("still mints an id where randomUUID is missing", () => {
    // Arrange
    vi.stubGlobal("crypto", {
      getRandomValues: (values: Uint32Array) => values.fill(0xabcdef01),
    });

    // Act
    const diagnostics = withClientTraceId({}, new Error("boom"));

    // Assert
    expect(diagnostics.traceId).toBe("abcdef01".repeat(4));
  });

  it.each([
    ["a server digest", { digest: "3804550175" }],
    ["an API trace id", { traceId: "api-trace-1234" }],
  ])("keeps %s and mints nothing", (_label, given) => {
    // Arrange
    const randomUUID = vi.spyOn(crypto, "randomUUID");

    // Act
    const diagnostics = withClientTraceId(given, new Error("boom"));

    // Assert
    expect(diagnostics).toEqual(given);
    expect(randomUUID).not.toHaveBeenCalled();
  });
});
