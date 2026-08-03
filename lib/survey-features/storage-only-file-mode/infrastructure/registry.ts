import { Serializer } from "survey-core";
import {
  STORAGE_ONLY_FILE_MODE_QUESTION_TYPES,
  STORE_DATA_AS_TEXT_PROPERTY,
  WAIT_FOR_UPLOAD_PROPERTY,
} from "../constants";

// Both are forced by bindStorageOnlyFileModeToSurvey (storeDataAsText: false,
// waitForUpload: true). Hide both from the grid — leaving either editable
// lets an author flip it back and silently defeat the enforcement.
const HIDDEN_PROPERTIES = [
  STORE_DATA_AS_TEXT_PROPERTY,
  WAIT_FOR_UPLOAD_PROPERTY,
] as const;

let isStorageOnlyFileModeRegistryInitialized = false;

function isPropertyHidden(type: string, propertyName: string): boolean {
  const prop = Serializer.findProperty(type, propertyName);
  return prop?.visible === false;
}

function areAllPropertiesHidden(type: string): boolean {
  return HIDDEN_PROPERTIES.every((propertyName) =>
    isPropertyHidden(type, propertyName),
  );
}

/**
 * Hides `storeDataAsText` and `waitForUpload` from the Creator property grid
 * for file/signaturepad questions. Call only when a storage provider is
 * enabled — without one, files must stay embedded as base64 text since
 * there's nowhere to upload them to.
 *
 * Deliberately leaves the Serializer's declared defaults (`true` for
 * storeDataAsText, `false` for waitForUpload) untouched. Flipping a default
 * here would make bindStorageOnlyFileModeToSurvey's explicit value equal to
 * "default" and get dropped from the saved JSON — then a respondent's Model
 * (a separate session that never runs this registry) would fall back to the
 * built-in default and silently misbehave (re-embed as base64, or not wait
 * for the upload). Setting the value explicitly per question instead means
 * it always differs from the default and always serializes.
 */
export function registerStorageOnlyFileModeGlobals(): void {
  if (
    isStorageOnlyFileModeRegistryInitialized &&
    STORAGE_ONLY_FILE_MODE_QUESTION_TYPES.every(areAllPropertiesHidden)
  ) {
    return;
  }

  STORAGE_ONLY_FILE_MODE_QUESTION_TYPES.forEach((type) => {
    HIDDEN_PROPERTIES.forEach((propertyName) => {
      const prop = Serializer.findProperty(type, propertyName);
      if (!prop) {
        return;
      }
      prop.visible = false;
    });
  });

  isStorageOnlyFileModeRegistryInitialized = true;
}

export function resetStorageOnlyFileModeRegistryForTests(): void {
  STORAGE_ONLY_FILE_MODE_QUESTION_TYPES.forEach((type) => {
    HIDDEN_PROPERTIES.forEach((propertyName) => {
      const prop = Serializer.findProperty(type, propertyName);
      if (!prop) {
        return;
      }
      prop.visible = true;
    });
  });

  isStorageOnlyFileModeRegistryInitialized = false;
}
