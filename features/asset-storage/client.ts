"use client";

export type {
  ClientStorageConfig,
  StorageConfigClient,
} from "@endatix/storage-azure";
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
  ProtectedImagePickerItem,
  ProtectedSurveyQuestionImagePicker,
  ProtectedImageItemValueAdorner,
  registerProtectedImageItem,
} from "./use-cases/view-protected-files/ui/protected-image-item";
export {
  ProtectedSurveyFileItem,
  registerProtectedFileItem,
} from "./use-cases/view-protected-files/ui/protected-file-item";
export { StoragePresignedLink } from './ui/storage-presigned-link';
export {
  AssetStorageContext,
  AssetStorageClientProvider,
  useAssetStorage,
  type AssetStorageContextValue,
} from "./ui/asset-storage.context";
export {
  usePrivateStorageDisplayUrl,
  type UsePrivateStorageDisplayUrlOptions,
} from './ui/use-resolved-private-storage-url';
export { LazyStorageMedia } from './ui/lazy-storage-media';
export { useNearViewport } from './ui/use-near-viewport';
export { useStorageReadRuntime } from './ui/use-storage-read-runtime';
export { StoragePresignedImage } from './ui/storage-presigned-image';

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
