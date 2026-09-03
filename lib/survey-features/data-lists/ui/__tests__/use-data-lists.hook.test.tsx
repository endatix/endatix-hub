import { renderHook } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/features/auth/authorization", () => ({
  authorization: vi.fn(),
}));

const loadUseDataListsHook = () => import("../use-data-lists.hook");

describe("useDataLists hooks", () => {
  let hooksModule: Awaited<ReturnType<typeof loadUseDataListsHook>>;

  beforeAll(async () => {
    hooksModule = await loadUseDataListsHook();
  });

  it("exposes bind helpers without fetching a catalog", () => {
    const { useDataLists } = hooksModule;
    const { result } = renderHook(() => useDataLists());

    expect(typeof result.current.initGlobals).toBe("function");
    expect(typeof result.current.bindToCreator).toBe("function");
    expect(typeof result.current.bindToSurvey).toBe("function");
  });
});
