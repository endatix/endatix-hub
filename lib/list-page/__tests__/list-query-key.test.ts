import { describe, expect, it } from "vitest";
import { listQueryKey } from "../list-query-key";

const base = { page: 1, pageSize: 10 };

describe("listQueryKey", () => {
  it.each([
    ["page", { page: 2 }],
    ["pageSize", { pageSize: 25 }],
    ["search", { search: "ada" }],
    ["sortBy", { sortBy: "name" }],
    ["sortDir", { sortDir: "desc" }],
    ["createdFrom", { createdFrom: "2026-01-01" }],
    ["a boolean filter", { isEnabled: false }],
    ["a nested sort", { sorting: [{ id: "createdAt", desc: true }] }],
  ])("changes when %s changes", (_, change) => {
    expect(listQueryKey({ ...base, ...change })).not.toBe(listQueryKey(base));
  });

  it("ignores field order", () => {
    expect(listQueryKey({ search: "ada", page: 1 })).toBe(
      listQueryKey({ page: 1, search: "ada" }),
    );
  });

  it("treats undefined and null as absent", () => {
    expect(listQueryKey({ ...base, search: undefined, role: null })).toBe(
      listQueryKey(base),
    );
  });

  it("does not collide when a delimiter sits in one field vs another", () => {
    expect(listQueryKey({ ...base, search: "ada|admin" })).not.toBe(
      listQueryKey({ ...base, role: "ada|admin" }),
    );
  });

  it("keeps array order, since sort priority is ordered", () => {
    expect(listQueryKey({ sorting: [{ id: "a" }, { id: "b" }] })).not.toBe(
      listQueryKey({ sorting: [{ id: "b" }, { id: "a" }] }),
    );
  });
});
