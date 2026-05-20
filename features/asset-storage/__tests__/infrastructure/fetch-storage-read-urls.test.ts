import { describe, expect, it } from "vitest";
import { pickStorageReadEndpoint } from "../../infrastructure/fetch-storage-read-urls";
import { HUB_STORAGE_READ_URLS_PATH, PUBLIC_STORAGE_READ_URLS_PATH } from "../../infrastructure/storage-api-policy";

describe("pickStorageReadEndpoint", () => {
  it("routes public policy to the public read-urls path", () => {
    expect(pickStorageReadEndpoint("public")).toBe(
      PUBLIC_STORAGE_READ_URLS_PATH,
    );
  });

  it("routes hub policy to the hub read-urls path", () => {
    expect(pickStorageReadEndpoint("hub")).toBe(HUB_STORAGE_READ_URLS_PATH);
  });
});
