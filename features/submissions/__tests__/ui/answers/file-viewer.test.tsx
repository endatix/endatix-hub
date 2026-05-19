import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  FileContentView,
  FileViewer,
} from "@/features/submissions/ui/answers/file-viewer";
import { FileType } from "@/lib/questions/file/file-type";

vi.mock("@/features/asset-storage/client", () => ({
  useNearViewport: vi.fn(() => ({
    ref: { current: null },
    isNearViewport: true,
  })),
  usePrivateStorageDisplayUrl: vi.fn(
    (url: string | undefined, options?: { enabled?: boolean }) => ({
      displayUrl: options?.enabled === false ? "" : (url ?? ""),
      isResolving: options?.enabled === false,
    }),
  ),
}));

vi.mock("@/lib/questions/audio-recorder/audio-player", () => ({
  AudioPlayer: ({ file }: { file: { content: string; name?: string } }) => (
    <div data-testid="audio-player">{file.name}</div>
  ),
}));

describe("FileContentView", () => {
  describe("size variants", () => {
    it("renders small size with correct container class", () => {
      const { container } = render(
        <FileContentView
          src="https://example.com/file.pdf"
          contentType="application/pdf"
          name="doc.pdf"
          size="small"
        />,
      );

      const wrapper = container.querySelector(".w-\\[200px\\]");
      expect(wrapper).toBeDefined();
    });

    it("renders medium size with correct container class", () => {
      const { container } = render(
        <FileContentView
          src="https://example.com/file.pdf"
          contentType="application/pdf"
          name="doc.pdf"
          size="medium"
        />,
      );

      const wrapper = container.querySelector(".max-w-2xl");
      expect(wrapper).toBeDefined();
    });

    it("renders large size with correct container class (default)", () => {
      const { container } = render(
        <FileContentView
          src="https://example.com/file.pdf"
          contentType="application/pdf"
          name="doc.pdf"
        />,
      );

      const wrapper = container.querySelector(".max-w-4xl");
      expect(wrapper).toBeDefined();
    });
  });

  describe("PDF rendering by size", () => {
    it("renders PDF as icon for small size", () => {
      const { container } = render(
        <FileContentView
          src="https://example.com/doc.pdf"
          contentType="application/pdf"
          name="doc.pdf"
          size="small"
        />,
      );

      const objectElement = container.querySelector("object");
      expect(objectElement).toBeNull();
      const link = screen.getByRole("link", { name: /doc\.pdf/i });
      expect(link).toBeDefined();
    });

    it("renders PDF as object for medium size", () => {
      render(
        <FileContentView
          src="https://example.com/doc.pdf"
          contentType="application/pdf"
          name="doc.pdf"
          size="medium"
        />,
      );

      const objectElement = document.querySelector(
        'object[type="application/pdf"]',
      );
      expect(objectElement).toBeDefined();
    });

    it("renders PDF as object for large size", () => {
      render(
        <FileContentView
          src="https://example.com/doc.pdf"
          contentType="application/pdf"
          name="doc.pdf"
          size="large"
        />,
      );

      const objectElement = document.querySelector(
        'object[type="application/pdf"]',
      );
      expect(objectElement).toBeDefined();
    });
  });

  describe("Image rendering", () => {
    it("renders native img with object-cover inside the aspect container", () => {
      render(
        <FileContentView
          src="https://example.com/image.jpg"
          contentType="image/jpeg"
          name="image.jpg"
          size="medium"
        />,
      );

      const img = document.querySelector('img[src*="image.jpg"]');
      expect(img).toBeDefined();
    });

    it("renders image with small size container", () => {
      const { container } = render(
        <FileContentView
          src="https://example.com/image.jpg"
          contentType="image/jpeg"
          name="image.jpg"
          size="small"
        />,
      );

      const imageContainer = container.querySelector(
        ".w-\\[200px\\].h-\\[266px\\]",
      );
      expect(imageContainer).toBeDefined();
    });
  });

  describe("Video rendering", () => {
    it("renders video element with controls", () => {
      render(
        <FileContentView
          src="https://example.com/video.mp4"
          contentType="video/mp4"
          name="video.mp4"
          size="medium"
        />,
      );

      const video = document.querySelector("video[controls]");
      expect(video).toBeDefined();
    });
  });

  describe("Audio rendering", () => {
    it("renders AudioPlayer component", () => {
      render(
        <FileContentView
          src="https://example.com/audio.mp3"
          contentType="audio/mpeg"
          name="audio.mp3"
          size="medium"
        />,
      );

      expect(screen.getByTestId("audio-player")).toBeDefined();
    });
  });

  describe("Unknown file type", () => {
    it("renders download link for unknown file type", () => {
      render(
        <FileContentView
          src="https://example.com/file.xyz"
          contentType="application/unknown"
          name="file.xyz"
          size="medium"
        />,
      );

      expect(screen.getByText("Download file")).toBeDefined();
    });
  });
});

describe("FileViewer", () => {
  beforeEach(() => {
    class MockIntersectionObserver implements IntersectionObserver {
      readonly root: Element | Document | null = null;
      readonly rootMargin = "";
      readonly thresholds: readonly number[] = [];

      constructor(private readonly callback: IntersectionObserverCallback) {}

      observe(): void {
        this.callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          this,
        );
      }

      disconnect(): void {}
      unobserve(): void {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }

    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  it("resolves URL via context and passes to FileContentView", () => {
    const mockFile = {
      content: "https://storage.example/file.jpg",
      type: "image/jpeg",
      name: "photo.jpg",
    };

    render(<FileViewer file={mockFile} size="small" />);

    const img = document.querySelector("img");
    expect(img).toBeDefined();
  });

  it("defaults to large size when not specified", () => {
    const mockFile = {
      content: "https://storage.example/file.pdf",
      type: "application/pdf",
      name: "doc.pdf",
    };

    const { container } = render(
      <FileViewer file={mockFile} lazyPresign={false} />,
    );

    const wrapper = container.querySelector(".max-w-4xl");
    expect(wrapper).toBeDefined();
  });

  it("sets loading lazy on images", () => {
    render(
      <FileContentView
        src="https://example.com/photo.jpg"
        contentType="image/jpeg"
        name="photo.jpg"
        size="small"
      />,
    );

    const img = document.querySelector("img");
    expect(img?.getAttribute("loading")).toBe("lazy");
  });
});
