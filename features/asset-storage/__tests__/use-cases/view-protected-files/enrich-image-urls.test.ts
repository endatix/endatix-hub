import { describe, it, expect, beforeEach, vi } from "vitest";
import * as React from "react";
import {
  enrichImageElement,
  enrichImagesInContainer,
  enrichImageBySrc,
  enrichImageInJSX,
  ORIGINAL_SRC_ATTRIBUTE,
} from "@/features/asset-storage/use-cases/view-protected-files/enrich-image-urls";

describe("enrich-image-urls", () => {
  const mockResolveStorageUrl = vi.fn((url: string) => `${url}?token=abc123`);

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  describe("enrichImageElement", () => {
    it("should return false if img is null", () => {
      const result = enrichImageElement(null as any, mockResolveStorageUrl);
      expect(result).toBe(false);
    });

    it("should return false if resolveStorageUrl is not provided", () => {
      const img = document.createElement("img");
      const result = enrichImageElement(img, null as any);
      expect(result).toBe(false);
    });

    it("should enrich image src when no original src attribute exists", () => {
      const img = document.createElement("img");
      img.src = "https://example.com/image.jpg";
      mockResolveStorageUrl.mockReturnValue(
        "https://example.com/image.jpg?token=abc123",
      );

      const result = enrichImageElement(img, mockResolveStorageUrl);

      expect(result).toBe(true);
      expect(img.src).toBe("https://example.com/image.jpg?token=abc123");
      expect(img.getAttribute(ORIGINAL_SRC_ATTRIBUTE)).toBe(
        "https://example.com/image.jpg",
      );
      expect(mockResolveStorageUrl).toHaveBeenCalledWith(
        "https://example.com/image.jpg",
      );
    });

    it("should not enrich if resolved URL is the same as current src", () => {
      const img = document.createElement("img");
      img.src = "https://example.com/image.jpg";
      mockResolveStorageUrl.mockReturnValue("https://example.com/image.jpg");

      const result = enrichImageElement(img, mockResolveStorageUrl);

      expect(result).toBe(false);
      expect(img.src).toBe("https://example.com/image.jpg");
    });

    it("should use stored original src if current src matches previously resolved URL", () => {
      const img = document.createElement("img");
      img.src = "https://example.com/image.jpg?token=abc123";
      img.setAttribute(ORIGINAL_SRC_ATTRIBUTE, "https://example.com/image.jpg");
      mockResolveStorageUrl.mockReturnValue(
        "https://example.com/image.jpg?token=abc123",
      );

      const result = enrichImageElement(img, mockResolveStorageUrl);

      expect(result).toBe(false);
      expect(mockResolveStorageUrl).toHaveBeenCalledWith(
        "https://example.com/image.jpg",
      );
    });

    it("should update original src if current src has changed", () => {
      const img = document.createElement("img");
      img.src = "https://example.com/new-image.jpg";
      img.setAttribute(
        ORIGINAL_SRC_ATTRIBUTE,
        "https://example.com/old-image.jpg",
      );
      mockResolveStorageUrl.mockReturnValue(
        "https://example.com/new-image.jpg?token=abc123",
      );

      const result = enrichImageElement(img, mockResolveStorageUrl);

      expect(result).toBe(true);
      expect(img.src).toBe("https://example.com/new-image.jpg?token=abc123");
      expect(img.getAttribute(ORIGINAL_SRC_ATTRIBUTE)).toBe(
        "https://example.com/new-image.jpg",
      );
    });
  });

  describe("enrichImagesInContainer", () => {
    it("should return early if container is null", () => {
      enrichImagesInContainer(null, mockResolveStorageUrl);
      expect(mockResolveStorageUrl).not.toHaveBeenCalled();
    });

    it("should return early if resolveStorageUrl is not provided", () => {
      const container = document.createElement("div");
      enrichImagesInContainer(container, null as any);
      expect(mockResolveStorageUrl).not.toHaveBeenCalled();
    });

    it("should enrich all images in container", () => {
      const container = document.createElement("div");
      const img1 = document.createElement("img");
      img1.src = "https://example.com/image1.jpg";
      const img2 = document.createElement("img");
      img2.src = "https://example.com/image2.jpg";
      container.appendChild(img1);
      container.appendChild(img2);

      mockResolveStorageUrl.mockImplementation((url) => `${url}?token=abc123`);

      enrichImagesInContainer(container, mockResolveStorageUrl);

      expect(img1.src).toBe("https://example.com/image1.jpg?token=abc123");
      expect(img2.src).toBe("https://example.com/image2.jpg?token=abc123");
      expect(mockResolveStorageUrl).toHaveBeenCalledTimes(2);
    });

    it("should not enrich images that are not in the container", () => {
      const container = document.createElement("div");
      const img1 = document.createElement("img");
      img1.src = "https://example.com/image1.jpg";
      container.appendChild(img1);

      const img2 = document.createElement("img");
      img2.src = "https://example.com/image2.jpg";
      document.body.appendChild(img2);

      mockResolveStorageUrl.mockImplementation((url) => `${url}?token=abc123`);

      enrichImagesInContainer(container, mockResolveStorageUrl);

      expect(img1.src).toBe("https://example.com/image1.jpg?token=abc123");
      expect(img2.src).toBe("https://example.com/image2.jpg");
      expect(mockResolveStorageUrl).toHaveBeenCalledTimes(1);
    });
  });

  describe("enrichImageBySrc", () => {
    it("should return early if imageSrc is empty", () => {
      const container = document.createElement("div");
      enrichImageBySrc(container, "", mockResolveStorageUrl);
      expect(mockResolveStorageUrl).not.toHaveBeenCalled();
    });

    it("should return early if container is null", () => {
      enrichImageBySrc(
        null,
        "https://example.com/image.jpg",
        mockResolveStorageUrl,
      );
      expect(mockResolveStorageUrl).not.toHaveBeenCalled();
    });

    it("should return early if resolveStorageUrl is not provided", () => {
      const container = document.createElement("div");
      enrichImageBySrc(container, "https://example.com/image.jpg", null as any);
      expect(mockResolveStorageUrl).not.toHaveBeenCalled();
    });

    it("should enrich image matching the src", () => {
      const container = document.createElement("div");
      const img = document.createElement("img");
      img.src = "https://example.com/image.jpg";
      container.appendChild(img);

      mockResolveStorageUrl.mockReturnValue(
        "https://example.com/image.jpg?token=abc123",
      );

      enrichImageBySrc(
        container,
        "https://example.com/image.jpg",
        mockResolveStorageUrl,
      );

      expect(img.src).toBe("https://example.com/image.jpg?token=abc123");
      expect(img.getAttribute(ORIGINAL_SRC_ATTRIBUTE)).toBe(
        "https://example.com/image.jpg",
      );
    });

    it("should not enrich if image already has original src attribute", () => {
      const container = document.createElement("div");
      const img = document.createElement("img");
      img.src = "https://example.com/image.jpg";
      img.setAttribute(
        ORIGINAL_SRC_ATTRIBUTE,
        "https://example.com/original.jpg",
      );
      container.appendChild(img);

      enrichImageBySrc(
        container,
        "https://example.com/image.jpg",
        mockResolveStorageUrl,
      );

      expect(mockResolveStorageUrl).not.toHaveBeenCalled();
    });

    it("should not enrich if resolved URL is the same as original", () => {
      const container = document.createElement("div");
      const img = document.createElement("img");
      img.src = "https://example.com/image.jpg";
      container.appendChild(img);

      mockResolveStorageUrl.mockReturnValue("https://example.com/image.jpg");

      enrichImageBySrc(
        container,
        "https://example.com/image.jpg",
        mockResolveStorageUrl,
      );

      expect(img.src).toBe("https://example.com/image.jpg");
      expect(img.getAttribute(ORIGINAL_SRC_ATTRIBUTE)).toBeNull();
    });

    it("should not enrich if image with matching src is not found", () => {
      const container = document.createElement("div");
      const img = document.createElement("img");
      img.src = "https://example.com/other-image.jpg";
      container.appendChild(img);

      enrichImageBySrc(
        container,
        "https://example.com/image.jpg",
        mockResolveStorageUrl,
      );

      expect(mockResolveStorageUrl).not.toHaveBeenCalled();
      expect(img.src).toBe("https://example.com/other-image.jpg");
    });
  });

  describe("enrichImageInJSX", () => {
    it("should return node if it is null", () => {
      const result = enrichImageInJSX(null as any, mockResolveStorageUrl);
      expect(result).toBeNull();
    });

    it("should return node if it is not a valid React element", () => {
      const node = "not a react element" as any;
      const result = enrichImageInJSX(node, mockResolveStorageUrl);
      expect(result).toBe(node);
    });

    it("should enrich img element", () => {
      mockResolveStorageUrl.mockReturnValue(
        "https://example.com/image.jpg?token=abc123",
      );
      const imgElement = React.createElement("img", {
        src: "https://example.com/image.jpg",
      });

      const result = enrichImageInJSX(imgElement, mockResolveStorageUrl);

      expect(result).not.toBe(imgElement);
      expect((result as React.ReactElement).props.src).toBe(
        "https://example.com/image.jpg?token=abc123",
      );
      expect((result as React.ReactElement).props[ORIGINAL_SRC_ATTRIBUTE]).toBe(
        "https://example.com/image.jpg",
      );
    });

    it("should not enrich img element if it already has original src attribute", () => {
      mockResolveStorageUrl.mockReturnValue(
        "https://example.com/image.jpg?token=abc123",
      );
      const imgElement = React.createElement("img", {
        src: "https://example.com/image.jpg?token=abc123",
        [ORIGINAL_SRC_ATTRIBUTE]: "https://example.com/image.jpg",
      });

      const result = enrichImageInJSX(imgElement, mockResolveStorageUrl);

      expect(result).toBe(imgElement);
    });

    it("should not enrich img element if src is not provided", () => {
      const imgElement = React.createElement("img", {});

      const result = enrichImageInJSX(imgElement, mockResolveStorageUrl);

      expect(result).toBe(imgElement);
      expect(mockResolveStorageUrl).not.toHaveBeenCalled();
    });

    it("should not enrich if resolved URL is the same as current src", () => {
      mockResolveStorageUrl.mockReturnValue("https://example.com/image.jpg");
      const imgElement = React.createElement("img", {
        src: "https://example.com/image.jpg",
      });

      const result = enrichImageInJSX(imgElement, mockResolveStorageUrl);

      expect(result).toBe(imgElement);
    });

    it("should enrich img element in nested children", () => {
      mockResolveStorageUrl.mockReturnValue(
        "https://example.com/image.jpg?token=abc123",
      );
      const divElement = React.createElement(
        "div",
        {},
        React.createElement("img", {
          src: "https://example.com/image.jpg",
        }),
      );

      const result = enrichImageInJSX(divElement, mockResolveStorageUrl);

      expect(result).not.toBe(divElement);
      const children = (result as React.ReactElement).props.children;
      // When there's a single child, React doesn't wrap it in an array
      if (React.isValidElement(children)) {
        expect(children.props.src).toBe(
          "https://example.com/image.jpg?token=abc123",
        );
      } else {
        const childrenArray = React.Children.toArray(children);
        expect(childrenArray.length).toBe(1);
        expect((childrenArray[0] as React.ReactElement).props.src).toBe(
          "https://example.com/image.jpg?token=abc123",
        );
      }
    });

    it("should enrich multiple img elements in children", () => {
      mockResolveStorageUrl.mockImplementation((url) => `${url}?token=abc123`);
      const divElement = React.createElement(
        "div",
        {},
        React.createElement("img", { src: "https://example.com/image1.jpg" }),
        React.createElement("img", { src: "https://example.com/image2.jpg" }),
      );

      const result = enrichImageInJSX(divElement, mockResolveStorageUrl);

      expect(result).not.toBe(divElement);
      const children = React.Children.toArray(
        (result as React.ReactElement).props.children,
      );
      expect(children.length).toBe(2);
      expect((children[0] as React.ReactElement).props.src).toBe(
        "https://example.com/image1.jpg?token=abc123",
      );
      expect((children[1] as React.ReactElement).props.src).toBe(
        "https://example.com/image2.jpg?token=abc123",
      );
    });

    it("should return original element if no changes were made", () => {
      const divElement = React.createElement("div", {}, "No images here");

      const result = enrichImageInJSX(divElement, mockResolveStorageUrl);

      expect(result).toBe(divElement);
    });

    it("should return original element if urlResolverFn is not provided", () => {
      const imgElement = React.createElement("img", {
        src: "https://example.com/image.jpg",
      });

      const result = enrichImageInJSX(imgElement, null as any);

      expect(result).toBe(imgElement);
    });

    it("should handle mixed children (elements and non-elements)", () => {
      mockResolveStorageUrl.mockReturnValue(
        "https://example.com/image.jpg?token=abc123",
      );
      const divElement = React.createElement(
        "div",
        {},
        "Text node",
        React.createElement("img", { src: "https://example.com/image.jpg" }),
        123,
      );

      const result = enrichImageInJSX(divElement, mockResolveStorageUrl);

      expect(result).not.toBe(divElement);
      const children = React.Children.toArray(
        (result as React.JSX.Element).props.children,
      );
      expect(children.length).toBe(3);
      expect(children[0]).toBe("Text node");
      expect((children[1] as React.JSX.Element).props.src).toBe(
        "https://example.com/image.jpg?token=abc123",
      );
      expect(children[2]).toBe(123);
    });
  });
});
