import * as React from "react";

const ORIGINAL_SRC_ATTRIBUTE = "data-original-src";

type UrlResolverFn = (url: string) => string;
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
function enrichImageElement(
  img: HTMLImageElement,
  resolveStorageUrl: (url: string) => string,
): boolean {
  if (!img || !resolveStorageUrl) return false;

  const currentSrc = img.src;
  const storedOriginal = img.getAttribute(ORIGINAL_SRC_ATTRIBUTE);

  // Determine the original source URL
  let originalSrc: string;
  if (storedOriginal) {
    const previouslyResolved = resolveStorageUrl(storedOriginal);
    if (currentSrc === previouslyResolved) {
      originalSrc = storedOriginal;
    } else {
      originalSrc = currentSrc;
      img.setAttribute(ORIGINAL_SRC_ATTRIBUTE, originalSrc);
    }
  } else {
    originalSrc = currentSrc;
    img.setAttribute(ORIGINAL_SRC_ATTRIBUTE, originalSrc);
  }

  // Resolve and update if needed
  const resolvedSrc = resolveStorageUrl(originalSrc);
  if (resolvedSrc !== currentSrc) {
    img.src = resolvedSrc;
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
): void {
  if (!container || !resolveStorageUrl) return;

  const images = container.querySelectorAll("img");
  images.forEach((img) => enrichImageElement(img, resolveStorageUrl));
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
): void {
  if (!imageSrc || !container || !resolveStorageUrl) return;

  const image = container.querySelector(
    `img[src="${imageSrc}"]`,
  ) as HTMLImageElement;

  if (!image) return;

  // Skip if already enriched (has original src attribute)
  if (image.getAttribute(ORIGINAL_SRC_ATTRIBUTE)) return;

  const resolvedUrl = resolveStorageUrl(imageSrc);
  if (resolvedUrl !== imageSrc) {
    image.setAttribute(ORIGINAL_SRC_ATTRIBUTE, imageSrc);
    image.src = resolvedUrl;
  }
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
    const { src, [ORIGINAL_SRC_ATTRIBUTE]: storedOriginal } = element.props;

    if (!src || storedOriginal) {
      return element;
    }
    const currentSrc = String(src);
    const enrichedSrc = urlResolverFn(currentSrc);

    if (currentSrc === enrichedSrc) {
      return element;
    }

    return React.cloneElement(element, {
      src: enrichedSrc,
      [ORIGINAL_SRC_ATTRIBUTE]: currentSrc,
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
