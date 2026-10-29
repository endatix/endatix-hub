import { describe, expect, it } from "vitest";
import { dereferencedExternalTraceIncludes } from "@/lib/hosting/standalone-trace-includes.mjs";

type Manifest = { dependencies?: Record<string, string> };

function reader(manifests: Record<string, Manifest>) {
  return (packageDir: string) => manifests[packageDir];
}

describe("dereferencedExternalTraceIncludes", () => {
  it("includes every dependency of sanitize-html's nested postcss from the top-level node_modules", () => {
    const includes = dereferencedExternalTraceIncludes(
      reader({
        "sanitize-html/node_modules/postcss": {
          dependencies: {
            nanoid: "^3.3.20",
            picocolors: "^1.1.1",
            "source-map-js": "^1.2.2",
          },
        },
      }),
    );

    expect(includes).toEqual([
      "./node_modules/nanoid/**/*",
      "./node_modules/picocolors/**/*",
      "./node_modules/source-map-js/**/*",
    ]);
  });

  it("includes nothing when postcss is not nested, since Turbopack then needs no symlink", () => {
    expect(dereferencedExternalTraceIncludes(reader({}))).toEqual([]);
  });

  it("includes nothing for a nested package without dependencies", () => {
    expect(
      dereferencedExternalTraceIncludes(
        reader({ "sanitize-html/node_modules/postcss": {} }),
      ),
    ).toEqual([]);
  });
});
