import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DownloadSubmissionFileButton } from "@/features/asset-storage/use-cases/download-user-file/download-submission-file-button";
import * as filesDownload from "@/lib/utils/files-download";
import { toast } from "@/components/ui/toast";

vi.mock("@/components/ui/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/utils/files-download", () => ({
  initiateFileDownload: vi.fn(),
}));

describe("DownloadSubmissionFileButton", () => {
  const downloadApiUrl =
    "/api/hub/v0/storage/submission-files/f1/s1/file.pdf/download-url";
  const mockBlobUrl = "https://storage.example.com/file.pdf?token=abc";
  const mockFileName = "report.pdf";

  let fetchMock: ReturnType<typeof vi.fn>;
  let initiateFileDownloadMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    initiateFileDownloadMock = vi.mocked(filesDownload.initiateFileDownload);
  });

  describe("rendering", () => {
    it("renders button with Download text and aria-label", () => {
      // Arrange
      render(<DownloadSubmissionFileButton downloadApiUrl={downloadApiUrl} />);

      // Act
      const button = screen.getByRole("button", { name: "Download" });

      // Assert
      expect(button).toBeDefined();
      expect((button as HTMLButtonElement).getAttribute("aria-label")).toBe(
        "Download",
      );
    });

    it("renders with custom children when provided", () => {
      // Arrange
      render(
        <DownloadSubmissionFileButton downloadApiUrl={downloadApiUrl}>
          Save file
        </DownloadSubmissionFileButton>,
      );

      // Act
      const button = screen.getByRole("button", { name: "Download" });

      // Assert
      expect(button.textContent).toContain("Save file");
    });
  });

  describe("successful download", () => {
    it("fetches download URL, fetches blob, calls initiateFileDownload and shows success toast", async () => {
      // Arrange
      const blob = new Blob(["content"], { type: "application/pdf" });
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ url: mockBlobUrl, fileName: mockFileName }),
        })
        .mockResolvedValueOnce({
          ok: true,
          blob: () => Promise.resolve(blob),
        });
      render(<DownloadSubmissionFileButton downloadApiUrl={downloadApiUrl} />);
      const button = screen.getByRole("button", { name: "Download" });

      // Act
      fireEvent.click(button);

      // Assert
      await waitFor(() => expect(toast.success).toHaveBeenCalled());
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenNthCalledWith(1, downloadApiUrl);
      expect(fetchMock).toHaveBeenNthCalledWith(2, mockBlobUrl);
      expect(initiateFileDownloadMock).toHaveBeenCalledWith(blob, mockFileName);
      expect(toast.success).toHaveBeenCalledWith({
        title: "File downloaded",
        description: "The file has been downloaded to your downloads folder.",
      });
    });
  });

  describe("API error", () => {
    it("shows error toast with detail when API returns non-ok with JSON detail", async () => {
      // Arrange
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ detail: "File not found" }),
      });
      render(<DownloadSubmissionFileButton downloadApiUrl={downloadApiUrl} />);
      const button = screen.getByRole("button", { name: "Download" });

      // Act
      fireEvent.click(button);

      // Assert
      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith({
        title: "Could not download file",
        description: "File not found",
      });
      expect(initiateFileDownloadMock).not.toHaveBeenCalled();
    });

    it("shows default error message when API returns non-ok without detail", async () => {
      // Arrange
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });
      render(<DownloadSubmissionFileButton downloadApiUrl={downloadApiUrl} />);
      const button = screen.getByRole("button", { name: "Download" });

      // Act
      fireEvent.click(button);

      // Assert
      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith({
        title: "Could not download file",
        description: "Failed to get download URL",
      });
    });
  });

  describe("blob fetch error", () => {
    it("shows error toast when blob fetch fails", async () => {
      // Arrange
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ url: mockBlobUrl, fileName: mockFileName }),
        })
        .mockResolvedValueOnce({ ok: false });
      render(<DownloadSubmissionFileButton downloadApiUrl={downloadApiUrl} />);
      const button = screen.getByRole("button", { name: "Download" });

      // Act
      fireEvent.click(button);

      // Assert
      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith({
        title: "Could not download file",
        description: "Failed to download file",
      });
      expect(initiateFileDownloadMock).not.toHaveBeenCalled();
    });
  });

  describe("loading state", () => {
    it("disables button and shows Preparing download aria-label while loading", async () => {
      // Arrange
      let resolveApi: (value: unknown) => void;
      const apiPromise = new Promise<Response>((resolve) => {
        resolveApi = resolve as (value: unknown) => void;
      });
      const blob = new Blob();
      fetchMock.mockReturnValueOnce(apiPromise).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(blob),
      });
      render(<DownloadSubmissionFileButton downloadApiUrl={downloadApiUrl} />);
      const button = screen.getByRole("button", { name: "Download" });

      // Act
      fireEvent.click(button);

      // Assert – loading state
      await waitFor(() => {
        expect((button as HTMLButtonElement).disabled).toBe(true);
        expect(button.getAttribute("aria-label")).toBe("Preparing download…");
      });

      // Act – resolve API so flow completes
      resolveApi!({
        ok: true,
        json: () =>
          Promise.resolve({ url: mockBlobUrl, fileName: mockFileName }),
      });

      // Assert – idle state
      await waitFor(() => {
        expect((button as HTMLButtonElement).disabled).toBe(false);
        expect(button.getAttribute("aria-label")).toBe("Download");
      });
    });
  });
});
