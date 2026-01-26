"use client";

export type {
  StorageConfig,
  StorageConfigClient,
} from "./infrastructure/storage-config-client";
export {
  registerProtectedFilePreview,
  ProtectedFilePreview,
} from "./use-cases/view-protected-files/ui/protected-file-preview";
export {
  AssetStorageContext,
  AssetStorageClientProvider,
  useAssetStorage,
  type AssetStorageContextValue,
  type AssetStorageTokens,
} from "./ui/asset-storage.context";

// Hooks
export { useStorageWithCreator } from "./ui/hooks/use-storage-with-creator.hook";
export { useContentUpload } from "./use-cases/upload-content-files/use-content-upload.hook";
export { useStorageUpload } from "./use-cases/upload-user-files/use-storage-upload.hook";
export { useStorageView } from "./use-cases/view-protected-files/use-storage-view.hook";
export { useSurveyStorage } from "./use-cases/upload-user-files/use-survey-storage.hook";
export {
  enrichImageInJSX,
  enrichImagesInContainer,
  enrichImageElement,
  ORIGINAL_SRC_ATTRIBUTE,
} from "./use-cases/view-protected-files/enrich-image-urls";
