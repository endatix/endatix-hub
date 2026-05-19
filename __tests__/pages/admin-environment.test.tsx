import EnvironmentPage from "@/app/(main)/admin/environment/page";
import { requireAdmin } from "@/components/admin-ui/admin-protection";
import { getStorageAdminSummary } from "@/features/asset-storage/server";
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
  getStorageAdminSummary: vi.fn(),
  IMAGE_SERVICE_CONFIG: {
    isResizeEnabled: false,
    defaultResizeWidth: 800,
  },
}));

vi.mock("@/next.config", () => ({
  default: {
    images: { remotePatterns: [] },
  },
}));

describe("Admin Environment Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStorageAdminSummary).mockReturnValue({
      activeProviderId: "azure",
      activeProviderLabel: "Azure Blob Storage",
      configuredProviderLabel: "azure",
      isEnabled: true,
      isPrivate: false,
      protocol: "https",
      hostName: "test.blob.core.windows.net",
      userFilesContainer: "user-files",
      contentContainer: "content",
      azureCredentialsPresent: true,
      s3CredentialsPresent: false,
      azure: {
        accountName: "testaccount",
        sasReadExpiryMinutes: 15,
        sasWriteExpirySeconds: 3600,
      },
      s3: null,
      configurationErrors: [],
    });
  });

  describe("requireAdmin", () => {
    it("redirects to unauthorized when not admin", async () => {
      vi.mocked(requireAdmin).mockImplementation(() => {
        vi.mocked(redirect)("/unauthorized");
        throw new Error("redirect");
      });

      await expect(EnvironmentPage()).rejects.toThrow("redirect");
      expect(redirect).toHaveBeenCalledWith("/unauthorized");
    });

    it("renders page content when admin", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({} as never);

      const result = await EnvironmentPage();
      render(result);

      expect(screen.getByText(/Environment Variables/)).toBeDefined();
      expect(screen.getByText(/Storage configuration/)).toBeDefined();
      expect(screen.getByText(/Image service/)).toBeDefined();
    });
  });

  describe("env variable masking", () => {
    it("masks sensitive env vars in output", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({} as never);
      const origKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
      process.env.AZURE_STORAGE_ACCOUNT_KEY = "my-secret-key";

      try {
        const result = await EnvironmentPage();
        render(result);

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
