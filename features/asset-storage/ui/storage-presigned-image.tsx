"use client";

import type { ImgHTMLAttributes } from "react";
import { usePrivateStorageDisplayUrl } from "./use-resolved-private-storage-url";

export type StoragePresignedImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
};

/**
 * Renders storage images without ever assigning an unsigned blob URL to {@code src}.
 * Resolves presigned GET URLs via cache + POST read-urls (per-object, Azure or S3).
 */
export function StoragePresignedImage({
  src,
  alt = "",
  className,
  style,
  ...rest
}: Readonly<StoragePresignedImageProps>) {
  const { displayUrl, isResolving } = usePrivateStorageDisplayUrl(src);

  if (isResolving || displayUrl.length === 0) {
    return (
      <span
        className={className}
        style={{
          ...style,
          display: "inline-block",
          minHeight: "1.5rem",
          minWidth: "1.5rem",
        }}
        aria-hidden
        data-storage-presign-pending="true"
      />
    );
  }

  return (
    <img
      src={displayUrl}
      alt={alt}
      className={className}
      style={style}
      data-storage-presign-managed="true"
      {...rest}
    />
  );
}
