import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearTableReturnTo,
  getTableReturnHref,
  rememberTableReturnTo,
} from "../table-return-to";

const identityParse = (query: string) => query;
const buildHref = (query: string) => `/things?${query}`;

describe("table return-to", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("returns the fallback when nothing is remembered", () => {
    // Arrange & Act & Assert
    expect(
      getTableReturnHref("things", "/things", identityParse, buildHref),
    ).toBe("/things");
  });

  it("remembers and restores a query, scoped by table key", () => {
    // Arrange
    rememberTableReturnTo("things", "page=2&search=abc", identityParse);

    // Act
    const href = getTableReturnHref(
      "things",
      "/things",
      identityParse,
      buildHref,
    );

    // Assert
    expect(href).toBe("/things?page=2&search=abc");
  });

  it("scopes remembered queries by scopeId independently", () => {
    // Arrange
    rememberTableReturnTo("things", "page=3", identityParse, "parent-a");
    rememberTableReturnTo("things", "page=5", identityParse, "parent-b");

    // Act & Assert
    expect(
      getTableReturnHref(
        "things",
        "/things",
        identityParse,
        buildHref,
        "parent-a",
      ),
    ).toBe("/things?page=3");
    expect(
      getTableReturnHref(
        "things",
        "/things",
        identityParse,
        buildHref,
        "parent-b",
      ),
    ).toBe("/things?page=5");
  });

  it("re-validates the stored value through parse on read (defense in depth)", () => {
    // Arrange — value was stored under an old/looser rule (or tampered).
    sessionStorage.setItem("ehx_table_return_things", "page=2&evil=<script>");
    const whitelistParse = (query: string) => {
      const params = new URLSearchParams(query);
      const page = params.get("page");
      return page ? `page=${page}` : "";
    };

    // Act
    const href = getTableReturnHref(
      "things",
      "/things",
      whitelistParse,
      buildHref,
    );

    // Assert
    expect(href).toBe("/things?page=2");
    expect(href).not.toContain("evil");
  });

  it("falls back when parse empties the stored query", () => {
    // Arrange
    rememberTableReturnTo("things", "junk=1", () => "");

    // Act & Assert
    expect(getTableReturnHref("things", "/things", () => "", buildHref)).toBe(
      "/things",
    );
  });

  it("falls back when parse throws", () => {
    // Arrange
    sessionStorage.setItem("ehx_table_return_things", "page=2");
    const throwingParse = () => {
      throw new Error("boom");
    };

    // Act & Assert
    expect(
      getTableReturnHref("things", "/things", throwingParse, buildHref),
    ).toBe("/things");
  });

  it("clears a remembered return-to", () => {
    // Arrange
    rememberTableReturnTo("things", "page=2", identityParse);

    // Act
    clearTableReturnTo("things");

    // Assert
    expect(
      getTableReturnHref("things", "/things", identityParse, buildHref),
    ).toBe("/things");
  });

  it("does not throw when sessionStorage is unavailable", () => {
    // Arrange
    const original = globalThis.sessionStorage;
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    });

    // Act & Assert
    expect(() =>
      rememberTableReturnTo("things", "page=2", identityParse),
    ).not.toThrow();
    expect(
      getTableReturnHref("things", "/things", identityParse, buildHref),
    ).toBe("/things");
    expect(() => clearTableReturnTo("things")).not.toThrow();

    vi.stubGlobal("sessionStorage", original);
  });
});
