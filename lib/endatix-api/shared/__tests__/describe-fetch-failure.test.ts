import { describe, expect, it } from "vitest";
import { describeFetchFailure } from "../describe-fetch-failure";

describe("describeFetchFailure", () => {
  it("extracts undici cause code from TypeError fetch failed", () => {
    // Arrange
    const cause = Object.assign(new Error("Connect Timeout Error"), {
      code: "UND_ERR_CONNECT_TIMEOUT",
      name: "ConnectTimeoutError",
    });
    const error = new TypeError("fetch failed", { cause });

    // Act
    const result = describeFetchFailure(error);

    // Assert
    expect(result).toEqual({
      message: "fetch failed",
      causeCode: "UND_ERR_CONNECT_TIMEOUT",
      causeName: "ConnectTimeoutError",
    });
  });

  it("returns the message only when there is no cause", () => {
    // Arrange & Act
    const result = describeFetchFailure(new TypeError("fetch failed"));

    // Assert
    expect(result).toEqual({
      message: "fetch failed",
      causeCode: undefined,
      causeName: undefined,
    });
  });
});
