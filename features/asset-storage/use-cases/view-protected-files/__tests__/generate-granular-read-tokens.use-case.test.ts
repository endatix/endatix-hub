import { Result } from "@/lib/result";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateGranularReadTokensUseCase } from "../generate-granular-read-tokens.use-case";

// Mock dependencies
vi.mock("../../../infrastructure/storage-config", () => ({
  getStorageConfig: vi.fn(),
}));

vi.mock("../../../infrastructure/storage-service", () => ({
  bulkGenerateReadTokens: vi.fn(),
}));

vi.mock("../../../utils", () => ({
  resolveContainerFromUrl: vi.fn(),
}));

import { getStorageConfig } from "../../../infrastructure/storage-config";
import { bulkGenerateReadTokens } from "../../../infrastructure/storage-service";
import { resolveContainerFromUrl } from "../../../utils";

describe("generateGranularReadTokensUseCase", () => {
  const mockStorageConfig = {
    isEnabled: true,
    isPrivate: true,
    accountName: "testaccount",
    accountKey: "testkey",
    hostName: "testaccount.blob.core.windows.net",
    sasReadExpiryMinutes: 15,
    containerNames: {
      USER_FILES: "user-files",
      CONTENT: "content",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStorageConfig).mockReturnValue(mockStorageConfig as any);
  });

  describe("storage configuration checks", () => {
    it("should return error when storage is not enabled", async () => {
      vi.mocked(getStorageConfig).mockReturnValue({
        ...mockStorageConfig,
        isEnabled: false,
      } as any);

      const result = await generateGranularReadTokensUseCase([
        "https://testaccount.blob.core.windows.net/content/file.jpg",
      ]);

      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe("Azure storage is not enabled");
      }
    });

    it("should return empty tokens when storage is not private", async () => {
      vi.mocked(getStorageConfig).mockReturnValue({
        ...mockStorageConfig,
        isPrivate: false,
      } as any);

      const result = await generateGranularReadTokensUseCase([
        "https://testaccount.blob.core.windows.net/content/file.jpg",
      ]);

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toEqual({});
      }
    });
  });

  describe("input validation", () => {
    it("should return empty tokens for empty array", async () => {
      const result = await generateGranularReadTokensUseCase([]);

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toEqual({});
      }
      expect(bulkGenerateReadTokens).not.toHaveBeenCalled();
    });

    it("should return empty tokens for null urls", async () => {
      const result = await generateGranularReadTokensUseCase(null as any);

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toEqual({});
      }
      expect(bulkGenerateReadTokens).not.toHaveBeenCalled();
    });

    it("should return empty tokens for undefined urls", async () => {
      const result = await generateGranularReadTokensUseCase(undefined as any);

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toEqual({});
      }
      expect(bulkGenerateReadTokens).not.toHaveBeenCalled();
    });
  });

  describe("URL resolution and grouping", () => {
    it("should skip URLs that cannot be resolved to a container", async () => {
      vi.mocked(resolveContainerFromUrl).mockReturnValue(null);

      const result = await generateGranularReadTokensUseCase([
        "https://other-storage.com/file.jpg",
        "invalid-url",
      ]);

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toEqual({});
      }
      expect(bulkGenerateReadTokens).not.toHaveBeenCalled();
    });

    it("should skip URLs that cannot resolve blob name", async () => {
      vi.mocked(resolveContainerFromUrl).mockReturnValue({
        containerType: "CONTENT",
        containerName: "content",
        hostName: "testaccount.blob.core.windows.net",
        isPrivate: true,
        blobName: "", // Empty blob name should be skipped
      });

      const result = await generateGranularReadTokensUseCase([
        "https://testaccount.blob.core.windows.net/content/",
      ]);

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toEqual({});
      }
      expect(bulkGenerateReadTokens).not.toHaveBeenCalled();
    });

    it("should group URLs by container", async () => {
      const contentUrl1 = "https://testaccount.blob.core.windows.net/content/file1.jpg";
      const contentUrl2 = "https://testaccount.blob.core.windows.net/content/file2.jpg";
      const userFilesUrl = "https://testaccount.blob.core.windows.net/user-files/doc.pdf";

      vi.mocked(resolveContainerFromUrl).mockImplementation((url) => {
        if (url === contentUrl1) {
          return {
            containerType: "CONTENT",
            containerName: "content",
            hostName: "testaccount.blob.core.windows.net",
            isPrivate: true,
            blobName: "file1.jpg",
          };
        }
        if (url === contentUrl2) {
          return {
            containerType: "CONTENT",
            containerName: "content",
            hostName: "testaccount.blob.core.windows.net",
            isPrivate: true,
            blobName: "file2.jpg",
          };
        }
        if (url === userFilesUrl) {
          return {
            containerType: "USER_FILES",
            containerName: "user-files",
            hostName: "testaccount.blob.core.windows.net",
            isPrivate: true,
            blobName: "doc.pdf",
          };
        }
        return null;
      });

      vi.mocked(bulkGenerateReadTokens).mockResolvedValue(
        Result.success({
          readTokens: {
            "file1.jpg": "token1",
            "file2.jpg": "token2",
            "doc.pdf": "token3",
          },
          expiresOn: new Date(),
          generatedAt: new Date(),
        }),
      );

      const result = await generateGranularReadTokensUseCase([
        contentUrl1,
        contentUrl2,
        userFilesUrl,
      ]);

      expect(bulkGenerateReadTokens).toHaveBeenCalledTimes(2);
      expect(bulkGenerateReadTokens).toHaveBeenCalledWith({
        containerName: "content",
        resourceType: "file",
        resourceNames: ["file1.jpg", "file2.jpg"],
      });
      expect(bulkGenerateReadTokens).toHaveBeenCalledWith({
        containerName: "user-files",
        resourceType: "file",
        resourceNames: ["doc.pdf"],
      });

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toEqual({
          [contentUrl1]: "token1",
          [contentUrl2]: "token2",
          [userFilesUrl]: "token3",
        });
      }
    });

    it("should deduplicate blob names within the same container", async () => {
      const url1 = "https://testaccount.blob.core.windows.net/content/file.jpg";
      const url2 = "https://testaccount.blob.core.windows.net/content/file.jpg"; // duplicate URL
      const url3 = "https://testaccount.blob.core.windows.net/content/file.jpg?existing=param"; // same blob, different URL

      vi.mocked(resolveContainerFromUrl).mockReturnValue({
        containerType: "CONTENT",
        containerName: "content",
        hostName: "testaccount.blob.core.windows.net",
        isPrivate: true,
        blobName: "file.jpg",
      });

      vi.mocked(bulkGenerateReadTokens).mockResolvedValue(
        Result.success({
          readTokens: {
            "file.jpg": "token123",
          },
          expiresOn: new Date(),
          generatedAt: new Date(),
        }),
      );

      const result = await generateGranularReadTokensUseCase([url1, url2, url3]);

      // Should only call once with unique blob name
      expect(bulkGenerateReadTokens).toHaveBeenCalledTimes(1);
      expect(bulkGenerateReadTokens).toHaveBeenCalledWith({
        containerName: "content",
        resourceType: "file",
        resourceNames: ["file.jpg"],
      });

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        // All URLs should map to the same token
        expect(result.value[url1]).toBe("token123");
        expect(result.value[url2]).toBe("token123");
        expect(result.value[url3]).toBe("token123");
      }
    });
  });

  describe("token generation", () => {
    it("should successfully generate tokens for single container", async () => {
      const url = "https://testaccount.blob.core.windows.net/content/image.jpg";

      vi.mocked(resolveContainerFromUrl).mockReturnValue({
        containerType: "CONTENT",
        containerName: "content",
        hostName: "testaccount.blob.core.windows.net",
        isPrivate: true,
        blobName: "image.jpg",
      });

      vi.mocked(bulkGenerateReadTokens).mockResolvedValue(
        Result.success({
          readTokens: {
            "image.jpg": "sas-token-123",
          },
          expiresOn: new Date(),
          generatedAt: new Date(),
        }),
      );

      const result = await generateGranularReadTokensUseCase([url]);

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toEqual({
          [url]: "sas-token-123",
        });
      }
    });

    it("should handle nested blob paths", async () => {
      const url = "https://testaccount.blob.core.windows.net/content/folder/subfolder/file.pdf";

      vi.mocked(resolveContainerFromUrl).mockReturnValue({
        containerType: "CONTENT",
        containerName: "content",
        hostName: "testaccount.blob.core.windows.net",
        isPrivate: true,
        blobName: "folder/subfolder/file.pdf",
      });

      vi.mocked(bulkGenerateReadTokens).mockResolvedValue(
        Result.success({
          readTokens: {
            "folder/subfolder/file.pdf": "nested-token",
          },
          expiresOn: new Date(),
          generatedAt: new Date(),
        }),
      );

      const result = await generateGranularReadTokensUseCase([url]);

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toEqual({
          [url]: "nested-token",
        });
      }
    });

    it("should skip containers when generateReadTokens fails", async () => {
      const contentUrl = "https://testaccount.blob.core.windows.net/content/file1.jpg";
      const userFilesUrl = "https://testaccount.blob.core.windows.net/user-files/file2.pdf";

      vi.mocked(resolveContainerFromUrl).mockImplementation((url) => {
        if (url === contentUrl) {
          return {
            containerType: "CONTENT",
            containerName: "content",
            hostName: "testaccount.blob.core.windows.net",
            isPrivate: true,
            blobName: "file1.jpg",
          };
        }
        return {
          containerType: "USER_FILES",
          containerName: "user-files",
          hostName: "testaccount.blob.core.windows.net",
          isPrivate: true,
          blobName: "file2.pdf",
        };
      });

      // First container fails, second succeeds
      vi.mocked(bulkGenerateReadTokens).mockImplementation(async (options) => {
        if (options.containerName === "content") {
          return Result.error("Failed to generate tokens");
        }
        return Result.success({
          readTokens: {
            "file2.pdf": "token2",
          },
          expiresOn: new Date(),
          generatedAt: new Date(),
        });
      });

      const result = await generateGranularReadTokensUseCase([contentUrl, userFilesUrl]);

      expect(bulkGenerateReadTokens).toHaveBeenCalledTimes(2);
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        // Only user-files token should be present
        expect(result.value).toEqual({
          [userFilesUrl]: "token2",
        });
        expect(result.value[contentUrl]).toBeUndefined();
      }
    });

    it("should handle partial token generation (some blobs missing tokens)", async () => {
      const url1 = "https://testaccount.blob.core.windows.net/content/file1.jpg";
      const url2 = "https://testaccount.blob.core.windows.net/content/file2.jpg";

      vi.mocked(resolveContainerFromUrl).mockImplementation((url) => {
        return {
          containerType: "CONTENT",
          containerName: "content",
          hostName: "testaccount.blob.core.windows.net",
          isPrivate: true,
          blobName: url === url1 ? "file1.jpg" : "file2.jpg",
        };
      });

      // Only file1.jpg gets a token, file2.jpg doesn't
      vi.mocked(bulkGenerateReadTokens).mockResolvedValue(
        Result.success({
          readTokens: {
            "file1.jpg": "token1",
            // file2.jpg is missing from readTokens
          },
          expiresOn: new Date(),
          generatedAt: new Date(),
        }),
      );

      const result = await generateGranularReadTokensUseCase([url1, url2]);

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value[url1]).toBe("token1");
        expect(result.value[url2]).toBeUndefined();
      }
    });
  });

  describe("complex scenarios", () => {
    it("should handle mixed valid and invalid URLs", async () => {
      const validUrl = "https://testaccount.blob.core.windows.net/content/file.jpg";
      const invalidUrl = "https://other-storage.com/file.jpg";
      const unresolvableUrl = "https://testaccount.blob.core.windows.net/content/";

      vi.mocked(resolveContainerFromUrl).mockImplementation((url) => {
        if (url === validUrl) {
          return {
            containerType: "CONTENT",
            containerName: "content",
            hostName: "testaccount.blob.core.windows.net",
            isPrivate: true,
            blobName: "file.jpg",
          };
        }
        return null;
      });

      vi.mocked(bulkGenerateReadTokens).mockResolvedValue(
        Result.success({
          readTokens: {
            "file.jpg": "token",
          },
          expiresOn: new Date(),
          generatedAt: new Date(),
        }),
      );

      const result = await generateGranularReadTokensUseCase([
        validUrl,
        invalidUrl,
        unresolvableUrl,
      ]);

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toEqual({
          [validUrl]: "token",
        });
      }
    });

    it("should handle large number of URLs efficiently", async () => {
      const urls = Array.from({ length: 100 }, (_, i) =>
        `https://testaccount.blob.core.windows.net/content/file${i}.jpg`,
      );

      vi.mocked(resolveContainerFromUrl).mockImplementation((url) => {
        const match = url.match(/file(\d+)\.jpg/);
        if (!match) return null;
        return {
          containerType: "CONTENT",
          containerName: "content",
          hostName: "testaccount.blob.core.windows.net",
          isPrivate: true,
          blobName: `file${match[1]}.jpg`,
        };
      });

      const readTokens: Record<string, string> = {};
      urls.forEach((url) => {
        const match = url.match(/file(\d+)\.jpg/);
        if (match) {
          readTokens[`file${match[1]}.jpg`] = `token-${match[1]}`;
        }
      });

      vi.mocked(bulkGenerateReadTokens).mockResolvedValue(
        Result.success({
          readTokens,
          expiresOn: new Date(),
          generatedAt: new Date(),
        }),
      );

      const result = await generateGranularReadTokensUseCase(urls);

      expect(Result.isSuccess(result)).toBe(true);
      expect(bulkGenerateReadTokens).toHaveBeenCalledTimes(1);
      expect(bulkGenerateReadTokens).toHaveBeenCalledWith({
        containerName: "content",
        resourceType: "file",
        resourceNames: expect.arrayContaining([
          expect.stringMatching(/^file\d+\.jpg$/),
        ]),
      });

      if (Result.isSuccess(result)) {
        expect(Object.keys(result.value).length).toBe(100);
        urls.forEach((url, index) => {
          expect(result.value[url]).toBe(`token-${index}`);
        });
      }
    });
  });
});
