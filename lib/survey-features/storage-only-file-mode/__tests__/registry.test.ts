import { Serializer } from "survey-core";
import { afterEach, describe, expect, it } from "vitest";
import { STORE_DATA_AS_TEXT_PROPERTY, WAIT_FOR_UPLOAD_PROPERTY } from "../constants";
import {
  registerStorageOnlyFileModeGlobals,
  resetStorageOnlyFileModeRegistryForTests,
} from "../infrastructure/registry";

describe("registerStorageOnlyFileModeGlobals", () => {
  afterEach(() => {
    resetStorageOnlyFileModeRegistryForTests();
  });

  it.each(["file", "signaturepad"])(
    "hides storeDataAsText and waitForUpload for %s",
    (type) => {
      // Act
      registerStorageOnlyFileModeGlobals();

      // Assert
      expect(
        Serializer.findProperty(type, STORE_DATA_AS_TEXT_PROPERTY)?.visible,
      ).toBe(false);
      expect(
        Serializer.findProperty(type, WAIT_FOR_UPLOAD_PROPERTY)?.visible,
      ).toBe(false);
    },
  );

  it.each(["file", "signaturepad"])(
    "leaves the built-in defaults untouched for %s",
    (type) => {
      // Act
      registerStorageOnlyFileModeGlobals();

      // Assert: an explicit storeDataAsText:false / waitForUpload:true must
      // stay distinguishable from "unset" so it still serializes on save
      // (see registry.ts and bindStorageOnlyFileModeToSurvey).
      expect(
        Serializer.findProperty(type, STORE_DATA_AS_TEXT_PROPERTY)
          ?.defaultValue,
      ).toBe(true);
      expect(
        Serializer.findProperty(type, WAIT_FOR_UPLOAD_PROPERTY)?.defaultValue,
      ).toBe(false);
    },
  );

  it("is idempotent across repeated calls", () => {
    // Act
    registerStorageOnlyFileModeGlobals();
    registerStorageOnlyFileModeGlobals();

    // Assert
    expect(
      Serializer.findProperty("file", STORE_DATA_AS_TEXT_PROPERTY)?.visible,
    ).toBe(false);
    expect(
      Serializer.findProperty("file", WAIT_FOR_UPLOAD_PROPERTY)?.visible,
    ).toBe(false);
  });
});

describe("resetStorageOnlyFileModeRegistryForTests", () => {
  it.each(["file", "signaturepad"])(
    "restores storeDataAsText and waitForUpload visibility for %s",
    (type) => {
      // Arrange
      registerStorageOnlyFileModeGlobals();

      // Act
      resetStorageOnlyFileModeRegistryForTests();

      // Assert
      expect(
        Serializer.findProperty(type, STORE_DATA_AS_TEXT_PROPERTY)?.visible,
      ).toBe(true);
      expect(
        Serializer.findProperty(type, WAIT_FOR_UPLOAD_PROPERTY)?.visible,
      ).toBe(true);
    },
  );
});
