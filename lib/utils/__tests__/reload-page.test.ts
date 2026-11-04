import { afterEach, describe, expect, it, vi } from "vitest";
import { reloadPage } from "../reload-page";

describe("reloadPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reloads the current document", () => {
    // Arrange
    const reload = vi.fn();
    vi.stubGlobal("window", { location: { reload } });

    // Act
    reloadPage();

    // Assert
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
