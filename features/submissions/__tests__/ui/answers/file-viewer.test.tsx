import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { usePrivateStorageDisplayUrl } from "@/features/asset-storage/client";
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
      refresh: vi.fn(),
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

      const wrapper = container.querySelector(".max-w-72");
      expect(wrapper).not.toBeNull();
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
    it("renders PDF as a file-kind tile for small size", () => {
      const { container } = render(
        <FileContentView
          src="https://example.com/doc.pdf"
          contentType="application/pdf"
          name="doc.pdf"
          size="small"
        />,
      );

      expect(container.querySelector("object")).toBeNull();
      expect(screen.getByText("PDF")).toBeDefined();
      expect(screen.queryByRole("link")).toBeNull();
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
    it("renders native img with object-contain so the ratio is preserved", () => {
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
      expect(img?.className).toContain("object-contain");
      expect(img?.className).not.toContain("object-cover");
    });

    it("gives small images a fixed-height frame without cropping", () => {
      const { container } = render(
        <FileContentView
          src="https://example.com/image.jpg"
          contentType="image/jpeg"
          name="image.jpg"
          size="small"
        />,
      );

      const img = container.querySelector("img");
      expect(img?.className).toContain("h-40");
      expect(img?.className).toContain("object-contain");
      expect(container.querySelector(".aspect-\\[3\\/4\\]")).toBeNull();
    });

    it("opens the details dialog from a small image instead of linking out", () => {
      const onOpen = vi.fn();
      render(
        <FileContentView
          src="https://example.com/image.jpg"
          contentType="image/jpeg"
          name="image.jpg"
          size="small"
          onOpen={onOpen}
        />,
      );

      expect(screen.queryByRole("link")).toBeNull();
      screen
        .getByRole("button", { name: "View details for image.jpg" })
        .click();
      expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it("reports a failed thumbnail load so the URL can be re-signed", () => {
      const onMediaError = vi.fn();
      const { container } = render(
        <FileContentView
          src="https://example.com/image.jpg?sig=expired"
          contentType="image/jpeg"
          name="image.jpg"
          size="small"
          onMediaError={onMediaError}
        />,
      );

      container.querySelector("img")?.dispatchEvent(new Event("error"));
      expect(onMediaError).toHaveBeenCalledTimes(1);
    });

    it("truncates a long small-size file name and keeps it in the title", () => {
      render(
        <FileContentView
          src="https://example.com/image.jpg"
          contentType="image/jpeg"
          name="a-very-long-file-name-from-a-phone-camera.jpg"
          size="small"
        />,
      );

      const caption = screen.getByText(
        "a-very-long-file-name-from-a-phone-camera.jpg",
      );
      expect(caption.className).toContain("truncate");
      expect(caption.getAttribute("title")).toBe(
        "a-very-long-file-name-from-a-phone-camera.jpg",
      );
    });
  });

  describe("Video rendering", () => {
    it("renders a small video as a poster frame without controls", () => {
      const { container } = render(
        <FileContentView
          src="https://example.com/video.mp4"
          contentType="video/mp4"
          name="video.mp4"
          size="small"
          onOpen={() => {}}
        />,
      );

      const video = container.querySelector("video");
      expect(video).not.toBeNull();
      expect(video?.hasAttribute("controls")).toBe(false);
      expect(video?.getAttribute("src")).toBe(
        "https://example.com/video.mp4#t=0.1",
      );
      expect(
        screen.getByRole("button", { name: "View details for video.mp4" }),
      ).toBeDefined();
    });

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

  it("re-signs a failing thumbnail once per file", () => {
    const refresh = vi.fn();
    const content = "https://storage.example/s/f/s/photo.jpg";
    vi.mocked(usePrivateStorageDisplayUrl).mockReturnValue({
      displayUrl: `${content}?sig=first`,
      isResolving: false,
      refresh,
    });

    const file = { content, type: "image/jpeg", name: "photo.jpg" };
    const { rerender, container } = render(
      <FileViewer file={file} size="small" />,
    );
    container.querySelector("img")?.dispatchEvent(new Event("error"));

    vi.mocked(usePrivateStorageDisplayUrl).mockReturnValue({
      displayUrl: `${content}?sig=second`,
      isResolving: false,
      refresh,
    });
    rerender(<FileViewer file={file} size="small" />);
    container.querySelector("img")?.dispatchEvent(new Event("error"));

    expect(refresh).toHaveBeenCalledTimes(1);
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
