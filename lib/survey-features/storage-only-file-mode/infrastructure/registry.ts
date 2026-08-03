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
 * Hides `storeDataAsText` from the Creator property grid for file/signaturepad
 * questions. Call only when a storage provider is enabled — without one,
 * files must stay embedded as base64 text since there's nowhere to upload
 * them to.
 *
 * Deliberately leaves the Serializer's `defaultValue` (`true`) untouched.
 * Flipping the default here would make an explicit `storeDataAsText: false`
 * equal to "default" and get dropped from the saved JSON — then a
 * respondent's Model (a separate session that never runs this registry)
 * would fall back to the built-in default of `true` and silently re-embed
 * files as base64. bindStorageOnlyFileModeToSurvey sets the value explicitly
 * per question instead, so it always differs from the default and always
 * serializes.
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
  });

  isStorageOnlyFileModeRegistryInitialized = false;
}
