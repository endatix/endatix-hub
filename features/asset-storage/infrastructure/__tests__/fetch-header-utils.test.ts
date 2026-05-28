import { describe, expect, it } from "vitest";
import {
  decodeHeaderValueFromFetch,
  encodeHeaderValueForFetch,
  sanitizeFetchHeaders,
} from "../fetch-header-utils";

describe("encodeHeaderValueForFetch / decodeHeaderValueFromFetch", () => {
  it("round-trips Cyrillic filenames", () => {
    // Arrange
    const original = "Билет - Будапеща.png";

    // Act
    const encoded = encodeHeaderValueForFetch(original);
    const decoded = decodeHeaderValueFromFetch(encoded);

    // Assert
    expect(encoded.startsWith("utf8:")).toBe(true);
    expect(encoded).toMatch(/^[\x00-\xff]+$/);
    expect(decoded).toBe(original);
  });

  it("leaves ASCII-only values unchanged", () => {
    expect(encodeHeaderValueForFetch("photo.png")).toBe("photo.png");
    expect(decodeHeaderValueFromFetch("photo.png")).toBe("photo.png");
  });
});

describe("sanitizeFetchHeaders", () => {
  it("removes header entries with code points above U+00FF", () => {
    // Arrange
    const headers = {
      "Content-Type": "image/png",
      "x-amz-meta-filename": "Билет.png",
      "x-amz-meta-formid": "123",
    };

    // Act
    const out = sanitizeFetchHeaders(headers);

    // Assert
    expect(out).toEqual({
      "Content-Type": "image/png",
      "x-amz-meta-formid": "123",
    });
  });

  it("keeps values that were encoded before sanitization", () => {
    const encoded = encodeHeaderValueForFetch("Билет.png");

    expect(
      sanitizeFetchHeaders({
        "x-ms-meta-filename": encoded,
      }),
    ).toEqual({
      "x-ms-meta-filename": encoded,
    });
  });
});
