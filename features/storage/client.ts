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
  StorageConfigContext,
  StorageConfigProvider,
  useStorageConfig,
  type StorageConfigContextValue,
} from "./infrastructure/storage-config.context";

// Hooks
export { useContentUpload } from "./use-cases/upload-content-files/use-content-upload.hook";
export { useStorageUpload } from "./use-cases/upload-user-files/use-storage-upload.hook";
export { useCreatorView } from "./use-cases/view-protected-files/use-creator-view.hook";
export { useStorageView } from "./use-cases/view-protected-files/use-storage-view.hook";
export { useCreatorStorage } from "./use-cases/upload-content-files/use-creator-storage.hook";
export { useSurveyStorage } from "./use-cases/upload-user-files/use-survey-storage.hook";
