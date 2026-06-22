import { describe, expect, it } from "vitest";
import { resolveFormsHeaderRouteContext } from "../resolve-forms-header-route-context";

describe("resolveFormsHeaderRouteContext", () => {
  it("returns null folder on root forms header", () => {
    expect(resolveFormsHeaderRouteContext(undefined)).toEqual({
      section: "forms",
      currentFolderSlug: null,
    });
    expect(resolveFormsHeaderRouteContext([])).toEqual({
      section: "forms",
      currentFolderSlug: null,
    });
  });

  it("does not treat a bare segment as a folder slug", () => {
    expect(resolveFormsHeaderRouteContext(["folder-exports"])).toEqual({
      section: "forms",
      currentFolderSlug: null,
    });
    expect(resolveFormsHeaderRouteContext(["form-123"])).toEqual({
      section: "forms",
      currentFolderSlug: null,
    });
  });

  it("reads slug after folders segment in multi-segment catch-all", () => {
    expect(
      resolveFormsHeaderRouteContext(["folders", "folder-exports"]),
    ).toEqual({
      section: "forms",
      currentFolderSlug: "folder-exports",
    });
  });

  it("reads template folder slug", () => {
    expect(
      resolveFormsHeaderRouteContext([
        "templates",
        "folders",
        "template-folder",
      ]),
    ).toEqual({
      section: "templates",
      currentFolderSlug: "template-folder",
    });
  });

  it("does not treat folders path segment as slug", () => {
    expect(resolveFormsHeaderRouteContext(["folders"])).toEqual({
      section: "forms",
      currentFolderSlug: null,
    });
  });
});
