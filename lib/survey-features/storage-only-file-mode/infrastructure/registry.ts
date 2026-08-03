import { Serializer } from "survey-core";
import {
  STORAGE_ONLY_FILE_MODE_QUESTION_TYPES,
  STORE_DATA_AS_TEXT_PROPERTY,
} from "../constants";

let isStorageOnlyFileModeRegistryInitialized = false;

function isStoreDataAsTextHidden(type: string): boolean {
  const prop = Serializer.findProperty(type, STORE_DATA_AS_TEXT_PROPERTY);
  return prop?.visible === false;
}

/**
 * Hides `storeDataAsText` from the Creator property grid and flips its
 * default to `false` for file/signaturepad questions. Call only when a
 * storage provider is enabled — without one, files must stay embedded as
 * base64 text since there's nowhere to upload them to.
 */
export function registerStorageOnlyFileModeGlobals(): void {
  if (
    isStorageOnlyFileModeRegistryInitialized &&
    STORAGE_ONLY_FILE_MODE_QUESTION_TYPES.every(isStoreDataAsTextHidden)
  ) {
    return;
  }

  STORAGE_ONLY_FILE_MODE_QUESTION_TYPES.forEach((type) => {
    const prop = Serializer.findProperty(type, STORE_DATA_AS_TEXT_PROPERTY);
    if (!prop) {
      return;
    }
    prop.visible = false;
    prop.defaultValue = false;
  });

  isStorageOnlyFileModeRegistryInitialized = true;
}

export function resetStorageOnlyFileModeRegistryForTests(): void {
  STORAGE_ONLY_FILE_MODE_QUESTION_TYPES.forEach((type) => {
    const prop = Serializer.findProperty(type, STORE_DATA_AS_TEXT_PROPERTY);
    if (!prop) {
      return;
    }
    prop.visible = true;
    prop.defaultValue = true;
  });

  isStorageOnlyFileModeRegistryInitialized = false;
}
