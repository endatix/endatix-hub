import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BrandPackError, readBrandPack } from "../read-pack";

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "fixtures",
);

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "brand-pack-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function useFixture(name: string) {
  copyFileSync(
    path.join(fixturesDir, `${name}.json`),
    path.join(dir, "brand.json"),
  );
}

function touch(...files: string[]) {
  for (const file of files) writeFileSync(path.join(dir, file), "<svg/>");
}

async function errorOf(run: () => Promise<unknown>): Promise<BrandPackError> {
  try {
    await run();
  } catch (error) {
    if (error instanceof BrandPackError) return error;
    throw error;
  }
  throw new Error("expected a BrandPackError");
}

describe("readBrandPack", () => {
  it("reads a valid pack and fingerprints it", async () => {
    // Arrange
    useFixture("valid-full");
    touch("og.jpg", "icon.svg", "logo-dark.svg", "logo-light.svg");

    // Act
    const loaded = await readBrandPack(dir);

    // Assert
    expect(loaded.pack.name).toBe("Example Forms");
    // Existing fingerprint of this fixture in field order, not file creation order.
    expect(loaded.fingerprint).toBe("79d2ded418f7");
  });

  it.each([
    ["an invalid one", { fromAddress: "not-an-email" }],
    ["one that is not an object", "noreply@example.com"],
  ])("ignores an email section, %s, as the API does", async (_, email) => {
    // Arrange: packs written before the sender moved to the API's email settings.
    writeFileSync(
      path.join(dir, "brand.json"),
      JSON.stringify({ version: 1, name: "Example Forms", email }),
    );

    // Act
    const loaded = await readBrandPack(dir);

    // Assert
    expect(loaded.pack).toEqual({ version: 1, name: "Example Forms" });
  });

  it("still rejects another unknown key", async () => {
    // Arrange
    useFixture("invalid-unknown-key");

    // Act
    const error = await errorOf(() => readBrandPack(dir));

    // Assert
    expect(error.message).toContain("fonts");
  });

  it("names the field path of a schema failure", async () => {
    // Arrange
    useFixture("invalid-path-traversal");

    // Act
    const error = await errorOf(() => readBrandPack(dir));

    // Assert
    expect(error.message).toContain(
      "assets.icon: Use a file inside the pack folder",
    );
  });

  it("reports every missing file in field order", async () => {
    // Arrange
    useFixture("valid-full");
    touch("logo-light.svg", "og.jpg");

    // Act
    const error = await errorOf(() => readBrandPack(dir));

    // Assert
    expect(error.message).toContain(
      "assets.logo.dark: logo-dark.svg not found\nassets.icon: icon.svg not found",
    );
  });

  it("refuses a file that links outside the pack", async () => {
    // Arrange
    writeFileSync(
      path.join(dir, "brand.json"),
      JSON.stringify({
        version: 1,
        name: "Example Forms",
        assets: { icon: "icon.svg" },
      }),
    );
    const outside = mkdtempSync(path.join(tmpdir(), "outside-"));
    writeFileSync(path.join(outside, "secret.svg"), "x");
    symlinkSync(path.join(outside, "secret.svg"), path.join(dir, "icon.svg"));

    // Act
    const error = await errorOf(() => readBrandPack(dir));

    // Assert
    expect(error.message).toContain(
      "assets.icon: icon.svg is outside the pack folder",
    );
    rmSync(outside, { recursive: true, force: true });
  });

  it.each([
    ["logo.gif", "is not a .svg, .png, .jpg, .jpeg, .webp or .ico file"],
    ["icon", "is not a .svg, .png, .jpg, .jpeg, .webp or .ico file"],
    ["./icon.svg", "Use a file inside the pack folder"],
    ["img//icon.svg", "Use a file inside the pack folder"],
    [".hidden.svg", "Use a file inside the pack folder"],
  ])("refuses %s, which the Hub could not serve", async (file, problem) => {
    // Arrange
    writeFileSync(
      path.join(dir, "brand.json"),
      JSON.stringify({
        version: 1,
        name: "Example Forms",
        assets: { icon: file },
      }),
    );
    mkdirSync(path.join(dir, "img"), { recursive: true });
    touch("logo.gif", "icon", "icon.svg", "img/icon.svg");

    // Act
    const error = await errorOf(() => readBrandPack(dir));

    // Assert
    expect(error.message).toMatch(
      new RegExp(`assets\\.icon: (${file.replaceAll(".", "\\.")} )?${problem}`),
    );
  });

  it("changes the fingerprint when only a named file changes", async () => {
    // Arrange
    writeFileSync(
      path.join(dir, "brand.json"),
      JSON.stringify({
        version: 1,
        name: "Example Forms",
        assets: { icon: "icon.svg" },
      }),
    );
    touch("icon.svg");
    const before = (await readBrandPack(dir)).fingerprint;
    writeFileSync(path.join(dir, "icon.svg"), "<svg>changed</svg>");

    // Act
    const after = (await readBrandPack(dir)).fingerprint;

    // Assert
    expect(after).not.toBe(before);
  });

  it("changes the fingerprint when a file's bytes change but its size and time do not", async () => {
    // Arrange
    writeFileSync(
      path.join(dir, "brand.json"),
      JSON.stringify({
        version: 1,
        name: "Example Forms",
        assets: { icon: "icon.svg" },
      }),
    );
    const icon = path.join(dir, "icon.svg");
    const when = new Date(2026, 0, 1);
    writeFileSync(icon, "<svg>A</svg>");
    utimesSync(icon, when, when);
    const before = (await readBrandPack(dir)).fingerprint;
    writeFileSync(icon, "<svg>B</svg>");
    utimesSync(icon, when, when);

    // Act
    const after = (await readBrandPack(dir)).fingerprint;

    // Assert
    expect(after).not.toBe(before);
  });

  it("reports a missing brand.json", async () => {
    // Act
    const error = await errorOf(() => readBrandPack(dir));

    // Assert
    expect(error.message).toContain("brand.json");
  });

  it("reports JSON that does not parse", async () => {
    // Arrange
    writeFileSync(path.join(dir, "brand.json"), "{ version: 1");

    // Act
    const error = await errorOf(() => readBrandPack(dir));

    // Assert
    expect(error.message).toMatch(/not valid JSON/);
  });
});
