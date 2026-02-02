import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FileViewMeta } from "@/features/asset-storage/use-cases/get-user-file/ui/file-view-meta";

vi.mock(
  "@/features/asset-storage/use-cases/download-user-file/download-submission-file-button",
  () => ({
    DownloadSubmissionFileButton: ({
      downloadApiUrl,
    }: {
      downloadApiUrl: string;
    }) => (
      <button type="button" data-testid="download-button">
        {downloadApiUrl}
      </button>
    ),
  }),
);

const defaultProps = {
  downloadApiUrl:
    "/api/hub/v0/storage/submission-files/f1/s1/file.pdf/download-url",
  displayName: "file.pdf",
};

describe("FileViewMeta", () => {
  describe("when no metadata is provided", () => {
    it("renders only the download button and no metadata list", () => {
      // Arrange
      const props = {
        ...defaultProps,
        originalFileName: undefined,
        questionName: undefined,
        sizeInBytes: undefined,
      };

      // Act
      render(<FileViewMeta {...props} />);

      // Assert
      expect(screen.getByTestId("download-button")).toBeDefined();
      expect(screen.queryByText("Original name:")).toBeNull();
      expect(screen.queryByText("Question:")).toBeNull();
      expect(screen.queryByText("Size:")).toBeNull();
    });
  });

  describe("when metadata fields are empty or whitespace", () => {
    it("does not show original name or question when empty string", () => {
      // Arrange
      const props = {
        ...defaultProps,
        originalFileName: "",
        questionName: "",
        sizeInBytes: undefined,
      };

      // Act
      render(<FileViewMeta {...props} />);

      // Assert
      expect(screen.queryByText("Original name:")).toBeNull();
      expect(screen.queryByText("Question:")).toBeNull();
    });

    it("does not show original name or question when whitespace-only", () => {
      // Arrange
      const props = {
        ...defaultProps,
        originalFileName: "   ",
        questionName: "\t\n",
        sizeInBytes: undefined,
      };

      // Act
      render(<FileViewMeta {...props} />);

      // Assert
      expect(screen.queryByText("Original name:")).toBeNull();
      expect(screen.queryByText("Question:")).toBeNull();
    });
  });

  describe("when only some metadata is present", () => {
    it("shows only original file name when other fields are missing", () => {
      // Arrange
      const props = {
        ...defaultProps,
        originalFileName: "report.pdf",
        questionName: undefined,
        sizeInBytes: undefined,
      };

      // Act
      render(<FileViewMeta {...props} />);

      // Assert
      expect(screen.getByText("Original name:")).toBeDefined();
      expect(screen.getByText("report.pdf")).toBeDefined();
      expect(screen.queryByText("Question:")).toBeNull();
      expect(screen.queryByText("Size:")).toBeNull();
    });

    it("shows only question name when other fields are missing", () => {
      // Arrange
      const props = {
        ...defaultProps,
        originalFileName: undefined,
        questionName: "Upload your document",
        sizeInBytes: undefined,
      };

      // Act
      render(<FileViewMeta {...props} />);

      // Assert
      expect(screen.getByText("Question:")).toBeDefined();
      expect(screen.getByText("Upload your document")).toBeDefined();
      expect(screen.queryByText("Original name:")).toBeNull();
      expect(screen.queryByText("Size:")).toBeNull();
    });

    it("shows only size when other fields are missing", () => {
      // Arrange
      const props = {
        ...defaultProps,
        originalFileName: undefined,
        questionName: undefined,
        sizeInBytes: 2048,
      };

      // Act
      render(<FileViewMeta {...props} />);

      // Assert
      expect(screen.getByText("Size:")).toBeDefined();
      expect(screen.getByText("2.0 KB")).toBeDefined();
      expect(screen.queryByText("Original name:")).toBeNull();
      expect(screen.queryByText("Question:")).toBeNull();
    });
  });

  describe("when size is edge or invalid", () => {
    it("shows size when sizeInBytes is 0", () => {
      // Arrange
      const props = { ...defaultProps, sizeInBytes: 0 };

      // Act
      render(<FileViewMeta {...props} />);

      // Assert
      expect(screen.getByText("Size:")).toBeDefined();
      expect(screen.getByText("0 B")).toBeDefined();
    });

    it("does not show size when sizeInBytes is NaN", () => {
      // Arrange
      const props = { ...defaultProps, sizeInBytes: Number.NaN };

      // Act
      render(<FileViewMeta {...props} />);

      // Assert
      expect(screen.queryByText("Size:")).toBeNull();
    });

    it("does not show size when sizeInBytes is negative", () => {
      // Arrange
      const props = { ...defaultProps, sizeInBytes: -100 };

      // Act
      render(<FileViewMeta {...props} />);

      // Assert
      expect(screen.queryByText("Size:")).toBeNull();
    });

    it("does not show size when sizeInBytes is Infinity", () => {
      // Arrange
      const props = { ...defaultProps, sizeInBytes: Number.POSITIVE_INFINITY };

      // Act
      render(<FileViewMeta {...props} />);

      // Assert
      expect(screen.queryByText("Size:")).toBeNull();
    });
  });

  describe("when all metadata is present", () => {
    it("shows original name, question, size and download button", () => {
      // Arrange
      const props = {
        ...defaultProps,
        originalFileName: "my-doc.pdf",
        questionName: "Attach PDF",
        sizeInBytes: 1024,
      };

      // Act
      render(<FileViewMeta {...props} />);

      // Assert
      expect(screen.getByText("Original name:")).toBeDefined();
      expect(screen.getByText("my-doc.pdf")).toBeDefined();
      expect(screen.getByText("Question:")).toBeDefined();
      expect(screen.getByText("Attach PDF")).toBeDefined();
      expect(screen.getByText("Size:")).toBeDefined();
      expect(screen.getByText("1.0 KB")).toBeDefined();
      expect(screen.getByTestId("download-button")).toBeDefined();
    });

    it("trims whitespace from original name and question when displaying", () => {
      // Arrange
      const props = {
        ...defaultProps,
        originalFileName: "  report.pdf  ",
        questionName: "  Upload file  ",
        sizeInBytes: 512,
      };

      // Act
      render(<FileViewMeta {...props} />);

      // Assert
      expect(screen.getByText("report.pdf")).toBeDefined();
      expect(screen.getByText("Upload file")).toBeDefined();
    });
  });

  describe("download button", () => {
    it("always renders download button regardless of metadata", () => {
      // Arrange – no metadata
      const propsNoMeta = { ...defaultProps };

      // Act
      const { unmount } = render(<FileViewMeta {...propsNoMeta} />);

      // Assert
      expect(screen.getByTestId("download-button")).toBeDefined();
      unmount();

      // Arrange – with metadata
      const propsWithMeta = {
        ...defaultProps,
        originalFileName: "a.pdf",
        questionName: "Q",
        sizeInBytes: 100,
      };

      // Act
      render(<FileViewMeta {...propsWithMeta} />);

      // Assert
      expect(screen.getByTestId("download-button")).toBeDefined();
    });
  });
});
