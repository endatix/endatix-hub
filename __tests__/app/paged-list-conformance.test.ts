import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Structural guard for the paged-list pattern (endatix-hub#1011). The bug
 * shipped because each list was wired by hand and nothing checked the wiring.
 * These rules fail the build when a new list skips a piece.
 */
const root = path.resolve(__dirname, "../..");

function sourceFiles(dir: string): string[] {
  return readdirSync(path.join(root, dir)).flatMap((name) => {
    const relative = path.join(dir, name);
    if (name === "node_modules" || name === "__tests__") return [];
    if (statSync(path.join(root, relative)).isDirectory()) {
      return sourceFiles(relative);
    }
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)
      ? [relative]
      : [];
  });
}

const files = ["app", "features", "components"]
  .flatMap(sourceFiles)
  .map((file) => ({
    file,
    source: readFileSync(path.join(root, file), "utf8"),
  }));

/** Pages that page in place on purpose. Each needs a reason. */
const UNKEYED_PAGED_PAGES: Record<string, string> = {
  "app/(main)/data-lists/[dataListId]/page.tsx":
    "items keep Suspense inside the client details section",
};

describe("paged list conformance", () => {
  it("every TanStack grid keys rows by entity id (getRowId)", () => {
    const offenders = files
      .filter(({ source }) => source.includes("useReactTable("))
      .filter(({ source }) => !source.includes("getRowId"))
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  it("every paged page keys its frame with listQueryKey, or says why not", () => {
    const offenders = files
      .filter(
        ({ file }) => file.startsWith("app/") && file.endsWith("page.tsx"),
      )
      .filter(({ source }) => /\bpageSize\b/.test(source))
      .filter(({ source }) => !source.includes("listQueryKey("))
      .map(({ file }) => file)
      .filter((file) => !(file in UNKEYED_PAGED_PAGES));

    expect(offenders).toEqual([]);
  });

  it("list keys come from listQueryKey, never a hand-rolled key", () => {
    const offenders = files
      .filter(({ file }) => file !== "components/table/paged-list-frame.tsx")
      .filter(({ source }) => /<Suspense\s+key=|SuspenseKey\(/.test(source))
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  it("loading is a skeleton: every frame fallback is a *Skeleton component", () => {
    const fallbacks = files
      .filter(({ source }) => source.includes("<PagedListFrame"))
      .flatMap(({ file, source }) =>
        [...source.matchAll(/<PagedListFrame[\s\S]*?fallback=\{<(\w+)/g)].map(
          ([, name]) => `${file}: ${name}`,
        ),
      );

    expect(fallbacks.length).toBeGreaterThan(0);
    expect(fallbacks.filter((entry) => !entry.endsWith("Skeleton"))).toEqual(
      [],
    );
  });

  it("loading is a skeleton: every DataTableGrid gets isPending for skeleton rows", () => {
    const offenders = files
      .filter(({ source }) => source.includes("<DataTableGrid"))
      .filter(({ source }) => {
        const grid = source.slice(source.indexOf("<DataTableGrid"));
        return !grid.slice(0, grid.indexOf("/>")).includes("isPending");
      })
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  it("loading is a skeleton: no text or dimming cues in list chrome", () => {
    const offenders = files
      .filter(({ source }) => /Updating(…|\.\.\.)/.test(source))
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  it("allow-listed pages still exist", () => {
    for (const file of Object.keys(UNKEYED_PAGED_PAGES)) {
      expect(
        files.some((entry) => entry.file === file),
        file,
      ).toBe(true);
    }
  });
});
