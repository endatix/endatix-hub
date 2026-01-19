import { describe, it, expect, vi } from "vitest";
import {
  generateUniqueFileName,
  resolveContainerFromUrl,
  isUrlFromContainer,
  getBlobNameFromUrl,
  enhanceUrlWithToken,
  escapeRegexSpecialChars,
  extractStorageUrls,
} from "../utils";
import { Result, ErrorType } from "@/lib/result";
import { StorageConfig } from "../infrastructure/storage-config-client";

// Mock uuid
vi.mock("uuid", () => ({
  v4: vi.fn().mockReturnValue("mock-uuid-123"),
}));

describe("generateUniqueFileName", () => {
  it("should generate unique filename with extension", () => {
    // Act
    const result = generateUniqueFileName("test.jpg");

    // Assert
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toBe("mock-uuid-123.jpg");
    }
  });

  it("should generate unique filename with multiple dots in name", () => {
    // Act
    const result = generateUniqueFileName("my.file.name.pdf");

    // Assert
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toBe("mock-uuid-123.pdf");
    }
  });

  it("should generate unique filename with complex extension", () => {
    // Act
    const result = generateUniqueFileName("document.tar.gz");

    // Assert
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toBe("mock-uuid-123.gz");
    }
  });

  it("should return validation error when fileName is empty", () => {
    // Act
    const result = generateUniqueFileName("");

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.errorType).toBe(ErrorType.ValidationError);
      expect(result.message).toBe("File name is required");
    }
  });

  it("should return validation error when fileName is undefined", () => {
    // Act
    const result = generateUniqueFileName(undefined as unknown as string);

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.errorType).toBe(ErrorType.ValidationError);
      expect(result.message).toBe("File name is required");
    }
  });

  it("should return validation error when fileName is null", () => {
    // Act
    const result = generateUniqueFileName(null as unknown as string);

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.errorType).toBe(ErrorType.ValidationError);
      expect(result.message).toBe("File name is required");
    }
  });

  it("should return validation error when fileName has no extension", () => {
    // Act
    const result = generateUniqueFileName("filename");

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.errorType).toBe(ErrorType.ValidationError);
      expect(result.message).toBe(
        "File extension is required. Please provide a valid file.",
      );
    }
  });

  it("should handle filename starting with dot", () => {
    // Act
    const result = generateUniqueFileName(".hidden");

    // Assert
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toBe("mock-uuid-123.hidden");
    }
  });

  it("should return validation error when fileName is just a dot", () => {
    // Act
    const result = generateUniqueFileName(".");

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.errorType).toBe(ErrorType.ValidationError);
      expect(result.message).toBe(
        "File extension is required. Please provide a valid file.",
      );
    }
  });

  it("should return validation error when fileName is multiple dots", () => {
    // Act
    const result = generateUniqueFileName("...");

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.errorType).toBe(ErrorType.ValidationError);
      expect(result.message).toBe(
        "File extension is required. Please provide a valid file.",
      );
    }
  });

  it("should handle filename with spaces", () => {
    // Act
    const result = generateUniqueFileName("my file name.txt");

    // Assert
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toBe("mock-uuid-123.txt");
    }
  });

  it("should handle filename with special characters", () => {
    // Act
    const result = generateUniqueFileName("file@#$%^&*().docx");

    // Assert
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toBe("mock-uuid-123.docx");
    }
  });

  it("should handle very long filename", () => {
    const longFileName = "a".repeat(100) + ".txt";

    // Act
    const result = generateUniqueFileName(longFileName);

    // Assert
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toBe("mock-uuid-123.txt");
    }
  });

  it("should handle filename with unicode characters", () => {
    // Act
    const result = generateUniqueFileName("файл.txt");

    // Assert
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toBe("mock-uuid-123.txt");
    }
  });
});

describe("resolveContainerFromUrl", () => {
  const mockStorageConfig: StorageConfig = {
    isEnabled: true,
    isPrivate: true,
    hostName: "testaccount.blob.core.windows.net",
    containerNames: {
      USER_FILES: "user-files",
      CONTENT: "content",
    },
  };

  it("should resolve USER_FILES container from URL", () => {
    const url = "https://testaccount.blob.core.windows.net/user-files/document.pdf";
    const result = resolveContainerFromUrl(url, mockStorageConfig);

    expect(result).not.toBeNull();
    expect(result?.containerType).toBe("USER_FILES");
    expect(result?.containerName).toBe("user-files");
    expect(result?.hostName).toBe("testaccount.blob.core.windows.net");
    expect(result?.isPrivate).toBe(true);
  });

  it("should resolve CONTENT container from URL", () => {
    const url = "https://testaccount.blob.core.windows.net/content/image.jpg";
    const result = resolveContainerFromUrl(url, mockStorageConfig);

    expect(result).not.toBeNull();
    expect(result?.containerType).toBe("CONTENT");
    expect(result?.containerName).toBe("content");
    expect(result?.hostName).toBe("testaccount.blob.core.windows.net");
    expect(result?.isPrivate).toBe(true);
  });

  it("should handle case-insensitive hostname matching", () => {
    const url = "https://TESTACCOUNT.blob.core.windows.net/content/image.jpg";
    const result = resolveContainerFromUrl(url, mockStorageConfig);

    expect(result).not.toBeNull();
    expect(result?.containerType).toBe("CONTENT");
  });

  it("should handle case-insensitive container name matching", () => {
    const url = "https://testaccount.blob.core.windows.net/CONTENT/image.jpg";
    const result = resolveContainerFromUrl(url, mockStorageConfig);

    expect(result).not.toBeNull();
    expect(result?.containerType).toBe("CONTENT");
  });

  it("should return null for URLs from different hostname", () => {
    const url = "https://other-account.blob.core.windows.net/content/image.jpg";
    const result = resolveContainerFromUrl(url, mockStorageConfig);

    expect(result).toBeNull();
  });

  it("should return null for unknown container", () => {
    const url = "https://testaccount.blob.core.windows.net/unknown-container/file.pdf";
    const result = resolveContainerFromUrl(url, mockStorageConfig);

    expect(result).toBeNull();
  });

  it("should return null for data URLs", () => {
    const url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const result = resolveContainerFromUrl(url, mockStorageConfig);

    expect(result).toBeNull();
  });

  it("should return null for empty URL", () => {
    const result = resolveContainerFromUrl("", mockStorageConfig);
    expect(result).toBeNull();
  });

  it("should return null when storageConfig is null", () => {
    const url = "https://testaccount.blob.core.windows.net/content/image.jpg";
    const result = resolveContainerFromUrl(url, null);

    expect(result).toBeNull();
  });

  it("should return null for invalid URL", () => {
    const url = "not-a-valid-url";
    const result = resolveContainerFromUrl(url, mockStorageConfig);

    expect(result).toBeNull();
  });

  it("should handle URLs with query parameters", () => {
    const url = "https://testaccount.blob.core.windows.net/content/image.jpg?sv=2021-06-08&ss=b&srt=sco";
    const result = resolveContainerFromUrl(url, mockStorageConfig);

    expect(result).not.toBeNull();
    expect(result?.containerType).toBe("CONTENT");
  });

  it("should handle URLs with nested paths", () => {
    const url = "https://testaccount.blob.core.windows.net/user-files/folder/subfolder/file.pdf";
    const result = resolveContainerFromUrl(url, mockStorageConfig);

    expect(result).not.toBeNull();
    expect(result?.containerType).toBe("USER_FILES");
  });

  it("should return null for URLs without path", () => {
    const url = "https://testaccount.blob.core.windows.net/";
    const result = resolveContainerFromUrl(url, mockStorageConfig);

    expect(result).toBeNull();
  });
});

describe("isUrlFromContainer", () => {
  const mockStorageConfig: StorageConfig = {
    isEnabled: true,
    isPrivate: true,
    hostName: "testaccount.blob.core.windows.net",
    containerNames: {
      USER_FILES: "user-files",
      CONTENT: "content",
    },
  };

  it("should return true for URL from matching container", () => {
    const url = "https://testaccount.blob.core.windows.net/content/image.jpg";
    const result = isUrlFromContainer(url, "content", mockStorageConfig);

    expect(result).toBe(true);
  });

  it("should return false for URL from different container", () => {
    const url = "https://testaccount.blob.core.windows.net/user-files/document.pdf";
    const result = isUrlFromContainer(url, "content", mockStorageConfig);

    expect(result).toBe(false);
  });

  it("should return false for empty container name", () => {
    const url = "https://testaccount.blob.core.windows.net/content/image.jpg";
    const result = isUrlFromContainer(url, "", mockStorageConfig);

    expect(result).toBe(false);
  });

  it("should return false when storageConfig is null", () => {
    const url = "https://testaccount.blob.core.windows.net/content/image.jpg";
    const result = isUrlFromContainer(url, "content", null);

    expect(result).toBe(false);
  });

  it("should handle case-insensitive container name", () => {
    const url = "https://testaccount.blob.core.windows.net/CONTENT/image.jpg";
    const result = isUrlFromContainer(url, "content", mockStorageConfig);

    expect(result).toBe(true);
  });
});

describe("getBlobNameFromUrl", () => {
  const mockStorageConfig: StorageConfig = {
    isEnabled: true,
    isPrivate: true,
    hostName: "testaccount.blob.core.windows.net",
    containerNames: {
      USER_FILES: "user-files",
      CONTENT: "content",
    },
  };

  it("should extract blob name from simple URL", () => {
    const url = "https://testaccount.blob.core.windows.net/content/image.jpg";
    const result = getBlobNameFromUrl(url, mockStorageConfig);

    expect(result).toBe("image.jpg");
  });

  it("should extract blob name with nested path", () => {
    const url = "https://testaccount.blob.core.windows.net/user-files/folder/subfolder/document.pdf";
    const result = getBlobNameFromUrl(url, mockStorageConfig);

    expect(result).toBe("folder/subfolder/document.pdf");
  });

  it("should return null for URL without blob path", () => {
    const url = "https://testaccount.blob.core.windows.net/content";
    const result = getBlobNameFromUrl(url, mockStorageConfig);

    expect(result).toBeNull();
  });

  it("should return null for URL with only container", () => {
    const url = "https://testaccount.blob.core.windows.net/content/";
    const result = getBlobNameFromUrl(url, mockStorageConfig);

    expect(result).toBeNull();
  });

  it("should return null for empty URL", () => {
    const result = getBlobNameFromUrl("", mockStorageConfig);
    expect(result).toBeNull();
  });

  it("should return null when storageConfig is null", () => {
    const url = "https://testaccount.blob.core.windows.net/content/image.jpg";
    const result = getBlobNameFromUrl(url, null);

    expect(result).toBeNull();
  });

  it("should return null for invalid URL", () => {
    const url = "not-a-valid-url";
    const result = getBlobNameFromUrl(url, mockStorageConfig);

    expect(result).toBeNull();
  });

  it("should handle URLs with query parameters", () => {
    const url = "https://testaccount.blob.core.windows.net/content/image.jpg?sv=2021-06-08";
    const result = getBlobNameFromUrl(url, mockStorageConfig);

    expect(result).toBe("image.jpg");
  });

  it("should handle deep nested paths", () => {
    const url = "https://testaccount.blob.core.windows.net/content/a/b/c/d/e/file.txt";
    const result = getBlobNameFromUrl(url, mockStorageConfig);

    expect(result).toBe("a/b/c/d/e/file.txt");
  });
});

describe("enhanceUrlWithToken", () => {
  it("should add token to URL without query parameters", () => {
    const url = "https://testaccount.blob.core.windows.net/content/image.jpg";
    const token = "sv=2021-06-08&ss=b&srt=sco";
    const result = enhanceUrlWithToken(url, token);

    expect(result).toBe("https://testaccount.blob.core.windows.net/content/image.jpg?sv=2021-06-08&ss=b&srt=sco");
  });

  it("should append token to URL with existing query parameters", () => {
    const url = "https://testaccount.blob.core.windows.net/content/image.jpg?existing=param";
    const token = "sv=2021-06-08&ss=b";
    const result = enhanceUrlWithToken(url, token);

    expect(result).toBe("https://testaccount.blob.core.windows.net/content/image.jpg?existing=param&sv=2021-06-08&ss=b");
  });

  it("should remove leading ? from token", () => {
    const url = "https://testaccount.blob.core.windows.net/content/image.jpg";
    const token = "?sv=2021-06-08&ss=b";
    const result = enhanceUrlWithToken(url, token);

    expect(result).toBe("https://testaccount.blob.core.windows.net/content/image.jpg?sv=2021-06-08&ss=b");
  });

  it("should return original URL when token is null", () => {
    const url = "https://testaccount.blob.core.windows.net/content/image.jpg";
    const result = enhanceUrlWithToken(url, null);

    expect(result).toBe(url);
  });

  it("should return original URL when token is undefined", () => {
    const url = "https://testaccount.blob.core.windows.net/content/image.jpg";
    const result = enhanceUrlWithToken(url, undefined);

    expect(result).toBe(url);
  });

  it("should return original URL when token is empty string", () => {
    const url = "https://testaccount.blob.core.windows.net/content/image.jpg";
    const result = enhanceUrlWithToken(url, "");

    expect(result).toBe(url);
  });

  it("should handle token with multiple query parameters", () => {
    const url = "https://testaccount.blob.core.windows.net/content/image.jpg";
    const token = "sv=2021-06-08&ss=b&srt=sco&sp=r&se=2024-12-31T23:59:59Z";
    const result = enhanceUrlWithToken(url, token);

    expect(result).toBe("https://testaccount.blob.core.windows.net/content/image.jpg?sv=2021-06-08&ss=b&srt=sco&sp=r&se=2024-12-31T23:59:59Z");
  });
});

describe("escapeRegexSpecialChars", () => {
  it("should escape backslash", () => {
    const input = "test\\path";
    const result = escapeRegexSpecialChars(input);

    expect(result).toBe("test\\\\path");
  });

  it("should escape caret", () => {
    const input = "test^path";
    const result = escapeRegexSpecialChars(input);

    expect(result).toBe("test\\^path");
  });

  it("should escape dollar sign", () => {
    const input = "test$path";
    const result = escapeRegexSpecialChars(input);

    expect(result).toBe("test\\$path");
  });

  it("should escape dot", () => {
    const input = "test.path";
    const result = escapeRegexSpecialChars(input);

    expect(result).toBe("test\\.path");
  });

  it("should escape pipe", () => {
    const input = "test|path";
    const result = escapeRegexSpecialChars(input);

    expect(result).toBe("test\\|path");
  });

  it("should escape question mark", () => {
    const input = "test?path";
    const result = escapeRegexSpecialChars(input);

    expect(result).toBe("test\\?path");
  });

  it("should escape asterisk", () => {
    const input = "test*path";
    const result = escapeRegexSpecialChars(input);

    expect(result).toBe("test\\*path");
  });

  it("should escape plus sign", () => {
    const input = "test+path";
    const result = escapeRegexSpecialChars(input);

    expect(result).toBe("test\\+path");
  });

  it("should escape parentheses", () => {
    const input = "test(path)";
    const result = escapeRegexSpecialChars(input);

    expect(result).toBe("test\\(path\\)");
  });

  it("should escape brackets", () => {
    const input = "test[path]";
    const result = escapeRegexSpecialChars(input);

    expect(result).toBe("test\\[path\\]");
  });

  it("should escape braces", () => {
    const input = "test{path}";
    const result = escapeRegexSpecialChars(input);

    expect(result).toBe("test\\{path\\}");
  });

  it("should escape multiple special characters", () => {
    const input = "test.path*with+special(chars)";
    const result = escapeRegexSpecialChars(input);

    expect(result).toBe("test\\.path\\*with\\+special\\(chars\\)");
  });

  it("should not escape regular characters", () => {
    const input = "testaccount.blob.core.windows.net";
    const result = escapeRegexSpecialChars(input);

    expect(result).toBe("testaccount\\.blob\\.core\\.windows\\.net");
  });

  it("should handle empty string", () => {
    const result = escapeRegexSpecialChars("");
    expect(result).toBe("");
  });
});

describe("extractStorageUrls", () => {
  const hostName = "testaccount.blob.core.windows.net";

  it("should extract single storage URL from string", () => {
    const content = '{"image": "https://testaccount.blob.core.windows.net/content/image.jpg"}';
    const result = extractStorageUrls(content, hostName);

    expect(result).toEqual([
      "https://testaccount.blob.core.windows.net/content/image.jpg",
    ]);
  });

  it("should extract multiple storage URLs from string", () => {
    const content = '{"images": ["https://testaccount.blob.core.windows.net/content/img1.jpg", "https://testaccount.blob.core.windows.net/user-files/doc.pdf"]}';
    const result = extractStorageUrls(content, hostName);

    expect(result).toEqual([
      "https://testaccount.blob.core.windows.net/content/img1.jpg",
      "https://testaccount.blob.core.windows.net/user-files/doc.pdf",
    ]);
  });

  it("should return unique URLs only", () => {
    const content = '{"image1": "https://testaccount.blob.core.windows.net/content/image.jpg", "image2": "https://testaccount.blob.core.windows.net/content/image.jpg"}';
    const result = extractStorageUrls(content, hostName);

    expect(result).toEqual([
      "https://testaccount.blob.core.windows.net/content/image.jpg",
    ]);
  });

  it("should ignore URLs from different hostnames", () => {
    const content = '{"image": "https://other-account.blob.core.windows.net/content/image.jpg"}';
    const result = extractStorageUrls(content, hostName);

    expect(result).toEqual([]);
  });

  it("should stop at query parameters (by design)", () => {
    const content = '{"image": "https://testaccount.blob.core.windows.net/content/image.jpg?existing=param"}';
    const result = extractStorageUrls(content, hostName);

    // The regex intentionally stops at ? to avoid capturing query parameters
    expect(result).toEqual([
      "https://testaccount.blob.core.windows.net/content/image.jpg",
    ]);
  });

  it("should stop at quotes in URL", () => {
    const content = '{"image": "https://testaccount.blob.core.windows.net/content/image.jpg"}';
    const result = extractStorageUrls(content, hostName);

    expect(result[0]).toBe("https://testaccount.blob.core.windows.net/content/image.jpg");
  });

  it("should stop at whitespace in URL", () => {
    const content = '{"image": "https://testaccount.blob.core.windows.net/content/image.jpg other text"}';
    const result = extractStorageUrls(content, hostName);

    expect(result[0]).toBe("https://testaccount.blob.core.windows.net/content/image.jpg");
  });

  it("should return empty array for null content", () => {
    const result = extractStorageUrls(null, hostName);
    expect(result).toEqual([]);
  });

  it("should return empty array for undefined content", () => {
    const result = extractStorageUrls(undefined, hostName);
    expect(result).toEqual([]);
  });

  it("should return empty array for empty hostName", () => {
    const content = '{"image": "https://testaccount.blob.core.windows.net/content/image.jpg"}';
    const result = extractStorageUrls(content, "");

    expect(result).toEqual([]);
  });

  it("should handle hostName with special regex characters", () => {
    const specialHostName = "test.account.blob.core.windows.net";
    const content = '{"image": "https://test.account.blob.core.windows.net/content/image.jpg"}';
    const result = extractStorageUrls(content, specialHostName);

    expect(result).toEqual([
      "https://test.account.blob.core.windows.net/content/image.jpg",
    ]);
  });

  it("should handle hostName with backslashes (security test)", () => {
    const maliciousHostName = "test\\account.blob.core.windows.net";
    const content = '{"image": "https://testaccount.blob.core.windows.net/content/image.jpg"}';
    const result = extractStorageUrls(content, maliciousHostName);

    // Should not match because hostname doesn't actually match
    expect(result).toEqual([]);
  });

  it("should extract URLs from large JSON string", () => {
    const largeJson = JSON.stringify({
      images: Array.from({ length: 100 }, (_, i) => ({
        url: `https://testaccount.blob.core.windows.net/content/image${i}.jpg`,
      })),
    });
    const result = extractStorageUrls(largeJson, hostName);

    expect(result.length).toBe(100);
    expect(result[0]).toBe("https://testaccount.blob.core.windows.net/content/image0.jpg");
    expect(result[99]).toBe("https://testaccount.blob.core.windows.net/content/image99.jpg");
  });

  it("should handle nested paths in URLs", () => {
    const content = '{"file": "https://testaccount.blob.core.windows.net/user-files/folder/subfolder/document.pdf"}';
    const result = extractStorageUrls(content, hostName);

    expect(result).toEqual([
      "https://testaccount.blob.core.windows.net/user-files/folder/subfolder/document.pdf",
    ]);
  });
});
