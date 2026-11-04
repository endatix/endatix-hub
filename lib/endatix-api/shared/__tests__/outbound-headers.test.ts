// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import {
  readOutboundHeaders,
  registerOutboundHeaders,
  withOutboundHeaders,
} from "../outbound-headers";

describe("outbound headers", () => {
  afterEach(() => {
    registerOutboundHeaders(undefined);
  });

  it("leaves the request alone with no provider registered", async () => {
    // Arrange
    const original: RequestInit = { method: "POST" };

    // Act
    const init = await withOutboundHeaders(original);

    // Assert
    expect(init).toBe(original);
  });

  it("sets the provider's headers, replacing a value already there", async () => {
    // Arrange
    registerOutboundHeaders(async () => ({ "X-Forwarded-For": "203.0.113.9" }));

    // Act
    const init = await withOutboundHeaders({
      headers: { Accept: "application/json", "X-Forwarded-For": "1.2.3.4" },
    });

    // Assert
    const headers = new Headers(init.headers);
    expect(headers.get("X-Forwarded-For")).toBe("203.0.113.9");
    expect(headers.get("Accept")).toBe("application/json");
  });

  it("leaves the request alone when the provider has nothing for this call", async () => {
    // Arrange
    registerOutboundHeaders(async () => undefined);
    const original: RequestInit = {};

    // Act
    const init = await withOutboundHeaders(original);

    // Assert
    expect(init).toBe(original);
  });

  it("propagates a provider rejection", async () => {
    // Arrange
    const bailout = new Error("Dynamic server usage");
    registerOutboundHeaders(() => Promise.reject(bailout));

    // Act
    const read = readOutboundHeaders();

    // Assert
    await expect(read).rejects.toBe(bailout);
  });
});
