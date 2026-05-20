import { describe, expect, it } from "vitest";
import {
  buildZipEntryNames,
  sanitizeZipEntryName,
} from "../build-submission-files-zip-from-storage.use-case";
import type { UserFileMetadata } from "@/features/asset-storage/types";

function file(
  overrides: Partial<UserFileMetadata> & Pick<UserFileMetadata, "displayName">,
): UserFileMetadata {
  return {
    kind: "user",
    contentType: "image/jpeg",
    sizeInBytes: 1,
    uploadedBy: "anonymous",
    ...overrides,
  };
}

describe("buildZipEntryNames", () => {
  it("uses prefix and question name with index for multiple files on same question", () => {
    const first = file({
      displayName: "a.jpg",
      questionName: "photo",
      originalFileName: "a.jpg",
    });
    const second = file({
      displayName: "b.jpg",
      questionName: "photo",
      originalFileName: "b.jpg",
    });
    const names = buildZipEntryNames([first, second], "run-");

    expect(names.get(first)).toBe("run-photo-1.jpg");
    expect(names.get(second)).toBe("run-photo-2.jpg");
  });

  it("uses prefix and question name without index for a single file", () => {
    const only = file({
      displayName: "a.jpg",
      questionName: "photo",
      originalFileName: "a.jpg",
    });
    const names = buildZipEntryNames([only], "run-");
    expect(names.get(only)).toBe("run-photo.jpg");
  });

  it("sanitizes invalid path characters", () => {
    expect(sanitizeZipEntryName("bad:name")).toBe("bad_name");
  });
});
