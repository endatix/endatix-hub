import type { AssetStorageContextValue } from "@/features/asset-storage/ui/asset-storage.context";
import { StoragePresignedImage } from "@/features/asset-storage/ui/storage-presigned-image";
import type { CSSProperties } from "react";

export function toCssObjectFit(
  imageFit: string,
): CSSProperties["objectFit"] | undefined {
  switch (imageFit) {
    case "contain":
    case "cover":
    case "fill":
    case "none":
    case "scale-down":
      return imageFit;
    default:
      return undefined;
  }
}

export function isPrivateStorageContext(
  ctx: AssetStorageContextValue | undefined,
): boolean {
  return Boolean(ctx?.config?.isEnabled && ctx.config.isPrivate);
}

export { StoragePresignedImage };
