import { describe, expect, it } from "vitest";
import { hrefWithSearchParamUpdates } from "../href-with-search-param-updates";

describe("hrefWithSearchParamUpdates", () => {
  it("adds a query param and keeps the path", () => {
    // Arrange
    const currentHref = "http://localhost:3000/forms/1/design";

    // Act
    const href = hrefWithSearchParamUpdates(currentHref, { tab: "preview" });

    // Assert
    expect(href).toBe("/forms/1/design?tab=preview");
  });

  it("preserves an existing basePath on the pathname", () => {
    // Arrange
    const currentHref = "https://app.example/hub/forms/1/design";

    // Act
    const href = hrefWithSearchParamUpdates(currentHref, { tab: "preview" });

    // Assert
    expect(href).toBe("/hub/forms/1/design?tab=preview");
  });

  it("deletes a key when the value is null", () => {
    // Arrange
    const currentHref = "http://localhost:3000/forms/1/design?tab=preview";

    // Act
    const href = hrefWithSearchParamUpdates(currentHref, { tab: null });

    // Assert
    expect(href).toBe("/forms/1/design");
  });

  it("returns null when the query would not change", () => {
    // Arrange
    const currentHref = "http://localhost:3000/forms/1/design?tab=preview";

    // Act
    const href = hrefWithSearchParamUpdates(currentHref, { tab: "preview" });

    // Assert
    expect(href).toBeNull();
  });

  it("keeps other search params and the hash", () => {
    // Arrange
    const currentHref =
      "http://localhost:3000/forms/1/design?foo=bar#toolbox";

    // Act
    const href = hrefWithSearchParamUpdates(currentHref, { tab: "json" });

    // Assert
    expect(href).toBe("/forms/1/design?foo=bar&tab=json#toolbox");
  });
});
