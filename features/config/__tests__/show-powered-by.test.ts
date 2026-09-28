import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EMPTY_CLIENT_ENDATIX_CONFIG,
  readPublicEndatixEnv,
  toClientEndatixConfig,
} from "../client-endatix-config";

describe("showPoweredBy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    [undefined, true],
    ["", true],
    ["true", true],
    ["false", false],
    ["FALSE", false],
  ])("reads ENDATIX_SHOW_POWERED_BY=%s as %s", (value, expected) => {
    // Arrange
    if (value !== undefined) {
      vi.stubEnv("ENDATIX_SHOW_POWERED_BY", value);
    }

    // Act & Assert
    expect(readPublicEndatixEnv().showPoweredBy).toBe(expected);
  });

  it("keeps the line shown when a partial config omits the field", () => {
    // Arrange — a legacy object serialised before the field existed.
    const { showPoweredBy: _omitted, ...legacy } = EMPTY_CLIENT_ENDATIX_CONFIG;

    // Act
    const config = toClientEndatixConfig(
      legacy as typeof EMPTY_CLIENT_ENDATIX_CONFIG,
    );

    // Assert
    expect(config.showPoweredBy).toBe(true);
  });

  it("hides the line only on an explicit false", () => {
    expect(
      toClientEndatixConfig({
        ...EMPTY_CLIENT_ENDATIX_CONFIG,
        showPoweredBy: false,
      }).showPoweredBy,
    ).toBe(false);
  });
});
