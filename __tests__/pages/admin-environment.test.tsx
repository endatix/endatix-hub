import EnvironmentPage from "@/app/(main)/admin/environment/page";
import { requireAdmin } from "@/components/admin-ui/admin-protection";
import { getStorageConfig } from "@/features/asset-storage/server";
import { render, screen } from "@testing-library/react";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/components/admin-ui/admin-protection", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/features/asset-storage/server", () => ({
  getStorageConfig: vi.fn(),
  AzureStorageConfig: {},
}));

vi.mock("@/next.config", () => ({
  default: {
    images: { remotePatterns: [] },
  },
}));

describe("Admin Environment Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStorageConfig).mockReturnValue({
      isEnabled: true,
      isPrivate: false,
      hostName: "test.blob.core.windows.net",
      protocol: "https",
      containerNames: { USER_FILES: "user-files", CONTENT: "content" },
      imageConfig: {
        isResizeEnabled: false,
        defaultResizeWidth: 800,
      },
    } as ReturnType<typeof getStorageConfig>);
  });

  describe("requireAdmin", () => {
    it("redirects to unauthorized when not admin", async () => {
      // Arrange: requireAdmin calls redirect (non-admin)
      vi.mocked(requireAdmin).mockImplementation(() => {
        vi.mocked(redirect)("/unauthorized");
        throw new Error("redirect");
      });

      // Act & Assert: page throws (redirect) and redirect was called
      await expect(EnvironmentPage()).rejects.toThrow("redirect");
      expect(redirect).toHaveBeenCalledWith("/unauthorized");
    });

    it("renders page content when admin", async () => {
      // Arrange
      vi.mocked(requireAdmin).mockResolvedValue({} as never);

      // Act
      const result = await EnvironmentPage();
      render(result);

      // Assert
      expect(screen.getByText(/Environment Variables/)).toBeDefined();
      expect(
        screen.getByText(/Azure Storage & Image Configuration/),
      ).toBeDefined();
    });
  });

  describe("env variable masking", () => {
    it("masks sensitive env vars in output", async () => {
      // Arrange
      vi.mocked(requireAdmin).mockResolvedValue({} as never);
      const origKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
      process.env.AZURE_STORAGE_ACCOUNT_KEY = "my-secret-key";

      try {
        // Act
        const result = await EnvironmentPage();
        render(result);

        // Assert: masked value (•) appears; raw secret must not appear in document
        expect(screen.getByText("AZURE_STORAGE_ACCOUNT_KEY")).toBeDefined();
        const body = document.body.textContent ?? "";
        expect(body).toMatch(/•+/);
        expect(body).not.toContain("my-secret-key");
      } finally {
        process.env.AZURE_STORAGE_ACCOUNT_KEY = origKey;
      }
    });
  });
});
