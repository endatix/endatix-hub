import * as React from "react";
import { StoragePresignedImage } from "@/features/asset-storage/ui/storage-presigned-image";

const ORIGINAL_SRC_ATTRIBUTE = "data-original-src";

type UrlResolverFn = (url: string) => string;

const StoragePresignDatasetMarker = {
  Managed: "storagePresignManaged",
  Pending: "storagePresignPending",
} as const;

type StoragePresignDatasetMarker =
  (typeof StoragePresignDatasetMarker)[keyof typeof StoragePresignDatasetMarker];

/**
 * Checks if a URL is from the asset storage host.
 * @param url - The URL to check
 * @param storageHostName - The name of the storage host
 * @returns true if the URL is from the asset storage host, false otherwise
 */
function isAssetStorageHost(
  url: string,
  storageHostName: string | undefined,
): boolean {
  if (!url || url.startsWith("data:") || !storageHostName) {
    return false;
  }
  try {
    return new URL(url).host.toLowerCase() === storageHostName.toLowerCase();
  } catch {
    return false;
  }
}

type ImageElementProps = React.DetailedHTMLProps<
  React.ImgHTMLAttributes<HTMLImageElement>,
  HTMLImageElement
> & {
  [ORIGINAL_SRC_ATTRIBUTE]?: string;
};
/**
 * Enriches a single image element's src attribute with a SAS token if needed.
 * Tracks the original URL to prevent double-enrichment and handle URL changes.
 *
 * @param img - The image element to enrich
 * @param resolveStorageUrl - Function to resolve storage URLs with tokens
 * @returns true if the image was enriched, false otherwise
 */
function hasDatasetMarker(
  element: HTMLElement,
  marker: StoragePresignDatasetMarker,
): boolean {
  return marker in element.dataset;
}

function hasPendingStoragePresignAncestor(img: HTMLImageElement): boolean {
  let currentElement = img.parentElement;

  while (currentElement) {
    if (hasDatasetMarker(currentElement, StoragePresignDatasetMarker.Pending)) {
      return true;
    }

    currentElement = currentElement.parentElement;
  }

  return false;
}

function isReactManagedStorageImage(img: HTMLImageElement): boolean {
  return (
    hasDatasetMarker(img, StoragePresignDatasetMarker.Managed) ||
    hasDatasetMarker(img, StoragePresignDatasetMarker.Pending) ||
    hasPendingStoragePresignAncestor(img)
  );
}

function enrichImageElement(
  img: HTMLImageElement,
  resolveStorageUrl: (url: string) => string,
  storageHostName?: string,
): boolean {
  if (!img || !resolveStorageUrl || isReactManagedStorageImage(img)) {
    return false;
  }

  const currentSrc = img.getAttribute("src") ?? img.src;
  const storedOriginal = img.getAttribute(ORIGINAL_SRC_ATTRIBUTE);

  let originalSrc: string;
  if (storedOriginal) {
    const previouslyResolved = resolveStorageUrl(storedOriginal);
    if (currentSrc === previouslyResolved || currentSrc.length === 0) {
      originalSrc = storedOriginal;
    } else {
      originalSrc = currentSrc;
    }
  } else if (currentSrc.length === 0) {
    return false;
  } else {
    originalSrc = currentSrc;
  }

  const resolvedSrc = resolveStorageUrl(originalSrc);

  if (resolvedSrc !== currentSrc) {
    img.setAttribute(ORIGINAL_SRC_ATTRIBUTE, originalSrc);
    img.src = resolvedSrc;
    return true;
  }

  if (
    resolvedSrc === originalSrc &&
    isAssetStorageHost(originalSrc, storageHostName) &&
    currentSrc === originalSrc
  ) {
    img.setAttribute(ORIGINAL_SRC_ATTRIBUTE, originalSrc);
    img.removeAttribute("src");
    return true;
  }

  return false;
}

/**
 * Enriches all image elements within a container with SAS tokens.
 * Used for bulk processing of images in a DOM subtree (e.g., question containers).
 *
 * @param container - The container element to scan for images
 * @param resolveStorageUrl - Function to resolve storage URLs with tokens
 */
function enrichImagesInContainer(
  container: HTMLElement | null,
  resolveStorageUrl: (url: string) => string,
  storageHostName?: string,
): void {
  if (!container || !resolveStorageUrl) return;

  const images = container.querySelectorAll("img");
  images.forEach((img) => {
    enrichImageElement(img, resolveStorageUrl, storageHostName);
  });
}

/**
 * Enriches a specific image element by matching its src attribute.
 * Used when you know the exact source URL and need to find and enrich that specific image.
 *
 * @param container - The container element to search for the image
 * @param imageSrc - The exact source URL to match
 * @param resolveStorageUrl - Function to resolve storage URLs with tokens
 */
function enrichImageBySrc(
  container: Element | null,
  imageSrc: string,
  resolveStorageUrl: (url: string) => string,
  storageHostName?: string,
): void {
  if (!imageSrc || !container || !resolveStorageUrl) return;

  const image = container.querySelector(
    `img[src="${imageSrc}"], img[data-original-src="${imageSrc}"]`,
  ) as HTMLImageElement;

  if (!image) return;

  if (image.getAttribute(ORIGINAL_SRC_ATTRIBUTE)) return;

  enrichImageElement(image, resolveStorageUrl, storageHostName);
}

/**
 * Enriches a single React element with a SAS token if needed.
 *
 * @param element - The React element to enrich
 * @param urlResolverFn - Function to resolve storage URLs with tokens
 * @returns The enriched React element (cloned if modified, original if not)
 */
function enrichElement(
  element: React.JSX.Element,
  urlResolverFn: UrlResolverFn,
): React.JSX.Element {
  if (!urlResolverFn) return element;

  if (isImgElement(element)) {
    const {
      src,
      [ORIGINAL_SRC_ATTRIBUTE]: storedOriginal,
      ...imgProps
    } = element.props;

    if (!src || storedOriginal) {
      return element;
    }

    const currentSrc = String(src);
    return React.createElement(StoragePresignedImage, {
      ...imgProps,
      src: currentSrc,
    });
  }

  const children = (element.props as React.PropsWithChildren)?.children;

  if (!children) {
    return element;
  }

  let didChange = false;

  const newChildren = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) {
      return child;
    }

    const enrichedChild = enrichElement(child, urlResolverFn);

    if (enrichedChild !== child) {
      didChange = true;
    }

    return enrichedChild;
  });

  if (!didChange) {
    return element;
  }

  return React.cloneElement(
    element as React.ReactElement<React.PropsWithChildren>,
    {
      children: newChildren,
    },
  );
}

function isImgElement(
  element: React.ReactElement,
): element is React.ReactElement<ImageElementProps> {
  return element.type === "img";
}

/**
 *
 * @param node
 * @param resolveStorageUrl
 * @returns
 */
function enrichImageInJSX(
  node: React.JSX.Element,
  resolveStorageUrl: UrlResolverFn,
): React.JSX.Element {
  if (!node) return node;

  if (!React.isValidElement(node)) {
    return node;
  }

  return enrichElement(node, resolveStorageUrl);
}

export {
  enrichImageElement,
  enrichImagesInContainer,
  enrichImageBySrc,
  enrichImageInJSX,
  ORIGINAL_SRC_ATTRIBUTE,
};
