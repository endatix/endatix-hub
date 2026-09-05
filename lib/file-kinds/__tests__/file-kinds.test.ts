import { describe, expect, it } from "vitest";
import { FileAudio, FileCode, FileImage, FileVideo } from "lucide-react";
import {
  FILE_KIND_GROUPS,
  FILE_KINDS,
  fileKindFromExtension,
  getFileKindKeysInGroup,
  isFileKindKey,
} from "../file-kinds";
import { getFileKindIcon } from "../file-kind-icons";

describe("FILE_KINDS", () => {
  it("uses lowercase keys matching extension for csv and json", () => {
    // Act & Assert
    expect(FILE_KINDS.csv.key).toBe("csv");
    expect(FILE_KINDS.csv.extension).toBe("csv");
    expect(FILE_KINDS.json.extension).toBe("json");
    expect(FILE_KINDS.xlsx.extension).toBe("xlsx");
    expect(FILE_KINDS.xlsx.label).toBe("Excel");
    expect(FILE_KINDS.pdf.mimeType).toBe("application/pdf");
    expect(FILE_KINDS.txt.extension).toBe("txt");
    expect(FILE_KINDS.zip.label).toBe("ZIP");
    expect(FILE_KINDS.xml.mimeType).toBe("application/xml");
  });

  it("narrows known keys", () => {
    // Act & Assert
    expect(isFileKindKey("csv")).toBe(true);
    expect(isFileKindKey("xlsx")).toBe(true);
    expect(isFileKindKey("pdf")).toBe(true);
    expect(isFileKindKey("xml")).toBe(true);
    expect(isFileKindKey("png")).toBe(true);
    expect(isFileKindKey("mp3")).toBe(true);
    expect(isFileKindKey("mp4")).toBe(true);
    expect(isFileKindKey("Xlsx")).toBe(false);
    expect(isFileKindKey("codebook")).toBe(false);
  });

  it("groups image, audio, and video files", () => {
    // Act & Assert
    expect(FILE_KIND_GROUPS.image.label).toBe("Image files");
    expect(FILE_KINDS.png.group).toBe("image");
    expect(FILE_KINDS.mp3.group).toBe("audio");
    expect(FILE_KINDS.webm.group).toBe("video");
    expect(getFileKindKeysInGroup("image")).toContain("jpeg");
    expect(getFileKindKeysInGroup("audio")).toContain("wav");
    expect(getFileKindKeysInGroup("video")).toContain("mp4");
  });

  it("resolves kinds from extensions", () => {
    // Act & Assert
    expect(fileKindFromExtension(".PNG")).toBe("png");
    expect(fileKindFromExtension("jpeg")).toBe("jpeg");
    expect(fileKindFromExtension("bin")).toBeUndefined();
  });
});

describe("getFileKindIcon", () => {
  it("uses group icons for media and an override for xml", () => {
    // Act & Assert
    expect(getFileKindIcon("png")).toBe(FileImage);
    expect(getFileKindIcon("mp3")).toBe(FileAudio);
    expect(getFileKindIcon("mp4")).toBe(FileVideo);
    expect(getFileKindIcon("xml")).toBe(FileCode);
  });
});
