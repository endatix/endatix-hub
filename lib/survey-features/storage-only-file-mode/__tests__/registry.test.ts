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
    "hides storeDataAsText for %s",
    (type) => {
      // Act
      registerStorageOnlyFileModeGlobals();

      // Assert
      const prop = Serializer.findProperty(type, STORE_DATA_AS_TEXT_PROPERTY);
      expect(prop?.visible).toBe(false);
    },
  );

  it.each(["file", "signaturepad"])(
    "leaves the built-in default (true) untouched for %s",
    (type) => {
      // Act
      registerStorageOnlyFileModeGlobals();

      // Assert: an explicit storeDataAsText:false must stay distinguishable
      // from "unset" so it still serializes on save (see registry.ts).
      const prop = Serializer.findProperty(type, STORE_DATA_AS_TEXT_PROPERTY);
      expect(prop?.defaultValue).toBe(true);
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
    "restores storeDataAsText visibility for %s",
    (type) => {
      // Arrange
      registerStorageOnlyFileModeGlobals();

      // Act
      resetStorageOnlyFileModeRegistryForTests();

      // Assert
      const prop = Serializer.findProperty(type, STORE_DATA_AS_TEXT_PROPERTY);
      expect(prop?.visible).toBe(true);
    },
  );
});
