import { Serializer } from "survey-core";
import { afterEach, describe, expect, it } from "vitest";
import { STORE_DATA_AS_TEXT_PROPERTY } from "../constants";
import {
  registerStorageOnlyFileModeGlobals,
  resetStorageOnlyFileModeRegistryForTests,
} from "../infrastructure/registry";

describe("registerStorageOnlyFileModeGlobals", () => {
  afterEach(() => {
    resetStorageOnlyFileModeRegistryForTests();
  });

  it.each(["file", "signaturepad"])(
    "hides storeDataAsText and defaults it to false for %s",
    (type) => {
      // Act
      registerStorageOnlyFileModeGlobals();

      // Assert
      const prop = Serializer.findProperty(type, STORE_DATA_AS_TEXT_PROPERTY);
      expect(prop?.visible).toBe(false);
      expect(prop?.defaultValue).toBe(false);
    },
  );

  it("is idempotent across repeated calls", () => {
    // Act
    registerStorageOnlyFileModeGlobals();
    registerStorageOnlyFileModeGlobals();

    // Assert
    const prop = Serializer.findProperty("file", STORE_DATA_AS_TEXT_PROPERTY);
    expect(prop?.visible).toBe(false);
  });
});

describe("resetStorageOnlyFileModeRegistryForTests", () => {
  it.each(["file", "signaturepad"])(
    "restores storeDataAsText visibility and default for %s",
    (type) => {
      // Arrange
      registerStorageOnlyFileModeGlobals();

      // Act
      resetStorageOnlyFileModeRegistryForTests();

      // Assert
      const prop = Serializer.findProperty(type, STORE_DATA_AS_TEXT_PROPERTY);
      expect(prop?.visible).toBe(true);
      expect(prop?.defaultValue).toBe(true);
    },
  );
});
