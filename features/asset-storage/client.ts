"use client";

export type {
  StorageConfig,
  StorageConfigClient,
} from "./infrastructure/storage-config-client";
export {
  ProtectedFilePreview,
  registerProtectedFilePreview,
} from "./use-cases/view-protected-files/ui/protected-file-preview";
export {
  ProtectedQuestionImage,
  registerProtectedImages,
} from "./use-cases/view-protected-files/ui/protected-image";
export {
  ProtectedLogoImage,
  ProtectedLogoImageComponent,
  registerProtectedLogoImage,
} from "./use-cases/view-protected-files/ui/protected-logo-image";
export {
  ProtectedSignaturePad,
  registerProtectedSignaturePad,
} from "./use-cases/view-protected-files/ui/protected-singaturepad";
export {
  ProtectedSurveyQuestionImagePicker,
  ProtectedImageItemValueAdorner,
  registerProtectedImageItem,
} from "./use-cases/view-protected-files/ui/protected-image-item";
export {
  AssetStorageContext,
  AssetStorageClientProvider,
  useAssetStorage,
  type AssetStorageContextValue,
  type AssetStorageTokens,
} from "./ui/asset-storage.context";

// Hooks
export { useStorageWithSurvey } from "./ui/hooks/use-storage-with-survey.hook";
export { useStorageWithCreator } from "./ui/hooks/use-storage-with-creator.hook";
export { useStorageView } from "./use-cases/view-protected-files/use-storage-view.hook";

export {
  enrichImageInJSX,
  enrichImagesInContainer,
  enrichImageElement,
  ORIGINAL_SRC_ATTRIBUTE,
} from "./use-cases/view-protected-files/enrich-image-urls";
