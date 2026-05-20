import { describe, expect, it } from "vitest";
import { buildStorageObjectKey } from "../providers/shared/storage-object-key";

describe("buildStorageObjectKey", () => {
  it("returns fileName when folderPath is omitted", () => {
    expect(buildStorageObjectKey("photo.jpg")).toBe("photo.jpg");
  });

  it("returns fileName when folderPath is empty or whitespace", () => {
    expect(buildStorageObjectKey("photo.jpg", "")).toBe("photo.jpg");
    expect(buildStorageObjectKey("photo.jpg", "   ")).toBe("photo.jpg");
  });

  it("joins folder and fileName", () => {
    expect(buildStorageObjectKey("photo.jpg", "s/form-1/sub-1")).toBe(
      "s/form-1/sub-1/photo.jpg",
    );
  });

  it("strips trailing slashes from folderPath", () => {
    expect(buildStorageObjectKey("photo.jpg", "s/form-1/sub-1/")).toBe(
      "s/form-1/sub-1/photo.jpg",
    );
    expect(buildStorageObjectKey("photo.jpg", "s/form-1/sub-1///")).toBe(
      "s/form-1/sub-1/photo.jpg",
    );
  });

  it("trims leading and trailing whitespace on folderPath", () => {
    expect(buildStorageObjectKey("photo.jpg", "  s/form-1/sub-1  ")).toBe(
      "s/form-1/sub-1/photo.jpg",
    );
  });
});
