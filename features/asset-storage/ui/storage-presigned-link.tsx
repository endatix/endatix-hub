"use client";

import type { AnchorHTMLAttributes } from "react";
import { usePrivateStorageDisplayUrl } from "./use-resolved-private-storage-url";

export type StoragePresignedLinkProps =
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

/**
 * Anchor that resolves private storage object URLs before navigation.
 */
export function StoragePresignedLink({
  href,
  children,
  ...rest
}: Readonly<StoragePresignedLinkProps>) {
  const { displayUrl, isResolving } = usePrivateStorageDisplayUrl(href);

  if (isResolving || displayUrl.length === 0) {
    return (
      <span data-storage-presign-pending="true" aria-hidden>
        {children}
      </span>
    );
  }

  return (
    <a href={displayUrl} data-storage-presign-managed="true" {...rest}>
      {children}
    </a>
  );
}
