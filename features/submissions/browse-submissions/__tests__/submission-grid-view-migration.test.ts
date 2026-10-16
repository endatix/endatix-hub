import { describe, expect, it } from "vitest";
import { SUBMISSION_GRID_METADATA_COLUMN_IDS } from "../submission-grid-columns";
import {
  legacyColumnOrderKey,
  legacyColumnVisibilityKey,
  legacyViewMigratedKey,
  migrateLegacyColumnView,
  readLegacyColumnViewOnce,
} from "../submission-grid-view-migration";

const FORM_ID = "42";

function memoryStorage(entries: Record<string, string> = {}): Storage {
  const store = new Map(Object.entries(entries));
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => void store.delete(key),
    setItem: (key, value) => void store.set(key, value),
  };
}

function legacyStorage(visibility: object, order?: string[]): Storage {
  return memoryStorage({
    [legacyColumnVisibilityKey(FORM_ID)]: JSON.stringify({
      columnVisibility: visibility,
      version: 1,
      updatedAt: "2026-10-01T00:00:00Z",
    }),
    ...(order && {
      [legacyColumnOrderKey(FORM_ID)]: JSON.stringify({
        columnOrder: order,
        version: 1,
        updatedAt: "2026-10-01T00:00:00Z",
      }),
    }),
  });
}

describe("readLegacyColumnViewOnce", () => {
  it("reads the legacy keys the first time only", () => {
    // Arrange
    const storage = legacyStorage({ data_q1: true }, ["data_q1"]);

    // Act
    const first = readLegacyColumnViewOnce(FORM_ID, storage);
    const second = readLegacyColumnViewOnce(FORM_ID, storage);

    // Assert
    expect(first).toEqual({
      visibility: { data_q1: true },
      order: ["data_q1"],
    });
    expect(second).toBeNull();
    expect(storage.getItem(legacyViewMigratedKey(FORM_ID))).not.toBeNull();
  });

  it("leaves the legacy keys for the legacy grid", () => {
    // Arrange
    const storage = legacyStorage({ data_q1: true });

    // Act
    readLegacyColumnViewOnce(FORM_ID, storage);

    // Assert
    expect(storage.getItem(legacyColumnVisibilityKey(FORM_ID))).not.toBeNull();
  });

  it("reads malformed entries as nothing", () => {
    // Arrange
    const storage = memoryStorage({
      [legacyColumnVisibilityKey(FORM_ID)]: "{not json",
    });

    // Act & Assert
    expect(readLegacyColumnViewOnce(FORM_ID, storage)).toBeNull();
  });

  it("reads blocked storage as nothing", () => {
    // Arrange
    const storage = memoryStorage();
    storage.getItem = () => {
      throw new DOMException("blocked", "SecurityError");
    };

    // Act & Assert
    expect(readLegacyColumnViewOnce(FORM_ID, storage)).toBeNull();
  });
});

describe("migrateLegacyColumnView", () => {
  const catalog = new Set(["q1", "q2", "q3", "submitter_email"]);

  it("moves shown questions over in the legacy order", () => {
    // Arrange
    const legacy = {
      visibility: {
        data_q1: true,
        data_q2: false,
        data_q3: true,
        submitterProfile_email: true,
        data_gone: true,
      },
      order: ["data_q3", "submitterProfile_email", "data_q1"],
    };

    // Act
    const migrated = migrateLegacyColumnView(legacy, catalog);

    // Assert
    expect(migrated?.answerKeys).toEqual(["q3", "submitter_email", "q1"]);
  });

  it("keeps this grid's default answers when no question was shown", () => {
    // Arrange
    const legacy = {
      visibility: { data_q1: false, submitterProfile_email: true },
    };

    // Act & Assert
    expect(migrateLegacyColumnView(legacy, catalog)).toBeNull();
  });

  it("moves hidden metadata and its order", () => {
    // Arrange
    const legacy = {
      visibility: { startedAt: false, actions: true },
      order: ["actions", "createdAt", "startedAt"],
    };

    // Act
    const migrated = migrateLegacyColumnView(legacy, catalog);

    // Assert
    expect(migrated?.answerKeys).toBeUndefined();
    expect(migrated?.layout.hiddenMetadata).toEqual(["startedAt"]);
    expect(migrated?.layout.metadataOrder.slice(0, 2)).toEqual([
      "createdAt",
      "startedAt",
    ]);
    expect(migrated?.layout.metadataOrder).toHaveLength(
      SUBMISSION_GRID_METADATA_COLUMN_IDS.length,
    );
  });
});
