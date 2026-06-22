import { describe, expect, it } from "vitest";
import {
  folderSlugsMatch,
  normalizeFolderSlug,
  safeDecodeURIComponent,
} from "../folder-slug-matching";

describe("safeDecodeURIComponent", () => {
  it("decodes valid percent-encoded segments", () => {
    expect(safeDecodeURIComponent("special%20folder")).toBe("special folder");
  });

  it("returns trimmed raw segment when decoding fails", () => {
    expect(safeDecodeURIComponent("bad%")).toBe("bad%");
    expect(safeDecodeURIComponent("  bad%  ")).toBe("bad%");
  });

  it("never throws for malformed runtime input", () => {
    expect(safeDecodeURIComponent(null as unknown as string)).toBe("");
    expect(safeDecodeURIComponent(undefined as unknown as string)).toBe("");
    expect(safeDecodeURIComponent("   ")).toBe("");
  });

  it("bounds extremely long segments", () => {
    const longSlug = `a${"b".repeat(300)}`;
    expect(safeDecodeURIComponent(longSlug)).toHaveLength(256);
  });
});

describe("folderSlugsMatch", () => {
  it("matches slugs case-insensitively after decoding", () => {
    expect(folderSlugsMatch("My-Folder", "my-folder")).toBe(true);
    expect(folderSlugsMatch("special%20folder", "special folder")).toBe(true);
  });

  it("does not throw when comparing malformed encoded slugs", () => {
    expect(() => folderSlugsMatch("bad%", "bad%")).not.toThrow();
    expect(folderSlugsMatch("bad%", "other")).toBe(false);
  });
});

describe("normalizeFolderSlug", () => {
  it("lowercases decoded slugs", () => {
    expect(normalizeFolderSlug("Marketing")).toBe("marketing");
  });
});
