import { utimesSync, writeFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { accent, mountPackDir } from "./pack-dir";

const flagState = vi.hoisted(() => ({ on: true }));

vi.mock("@/lib/feature-flags/flags", () => ({
  whiteLabelingFlag: async () => flagState.on,
}));
const telemetry = vi.hoisted(() => ({ error: vi.fn(), warn: vi.fn() }));
vi.mock("@/features/telemetry", () => ({ TelemetryLogger: telemetry }));
/** Runs once after the next pack read, as if the mount changed during it. */
const readHook = vi.hoisted(() => ({ after: null as null | (() => void) }));
vi.mock("../read-pack", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../read-pack")>();
  return {
    ...actual,
    readBrandPack: (dir: string) => {
      const loaded = actual.readBrandPack(dir);
      const after = readHook.after;
      readHook.after = null;
      after?.();
      return loaded;
    },
  };
});
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T>(fn: T) => fn,
}));

const pack = mountPackDir();

async function load() {
  vi.resetModules();
  return import("../server");
}

beforeEach(() => {
  flagState.on = true;
  readHook.after = null;
});

describe("getBrand", () => {
  it("is the built-in brand when no pack is mounted", async () => {
    // Arrange
    vi.stubEnv("ENDATIX_BRAND_DIR", "");
    const { getBrand } = await load();

    // Act
    const brand = await getBrand();

    // Assert
    expect(brand.name).toBe("Endatix Hub");
    expect(brand.stylesheet).toBe("");
  });

  it("ignores a mounted pack while the white-labeling flag is off", async () => {
    // Arrange
    pack.write(accent("#0b6b5d"));
    flagState.on = false;
    const { getBrand } = await load();

    // Act
    const brand = await getBrand();

    // Assert
    expect(brand.name).toBe("Endatix Hub");
    expect(brand.stylesheet).toBe("");
  });

  it("applies the mounted pack while the flag is on", async () => {
    // Arrange
    pack.write(accent("#0b6b5d"));
    const { getBrand } = await load();

    // Act
    const brand = await getBrand();

    // Assert
    expect(brand.name).toBe("Example Forms");
    expect(brand.stylesheet).toContain("--primary:#0b6b5d;");
  });

  it("re-reads the pack when brand.json changes", async () => {
    // Arrange
    pack.write(accent("#0b6b5d"), new Date(2026, 0, 1));
    const { getBrand } = await load();
    await getBrand();
    pack.write(accent("#7a1f8f"), new Date(2026, 0, 2));

    // Act
    const brand = await getBrand();

    // Assert
    expect(brand.stylesheet).toContain("--primary:#7a1f8f;");
  });

  it("gives a file new URLs when only that file changes", async () => {
    // Arrange
    pack.write({ assets: { icon: "icon.svg" } });
    const icon = path.join(pack.path, "icon.svg");
    writeFileSync(icon, "<svg/>");
    utimesSync(icon, new Date(2026, 0, 1), new Date(2026, 0, 1));
    const { getBrand } = await load();
    const before = (await getBrand()).icon;
    writeFileSync(icon, "<svg>new</svg>");
    utimesSync(icon, new Date(2026, 0, 2), new Date(2026, 0, 2));

    // Act
    const after = (await getBrand()).icon;

    // Assert
    expect(after).toMatch(/^\/brand\/icon\.svg\?v=/);
    expect(after).not.toBe(before);
  });

  it("loads a change made while the previous version was being read", async () => {
    // Arrange
    pack.write(accent("#0b6b5d"), new Date(2026, 0, 1));
    readHook.after = () => pack.write(accent("#7a1f8f"), new Date(2026, 0, 2));
    const { getBrand } = await load();
    await getBrand();

    // Act
    const brand = await getBrand();

    // Assert
    expect(brand.stylesheet).toContain("--primary:#7a1f8f;");
  });

  it("re-reads brand.json rewritten in place with the same size and time", async () => {
    // Arrange: only the inode's change time differs.
    const when = new Date(2026, 0, 1);
    pack.write(accent("#0b6b5d"), when);
    const { getBrand } = await load();
    await getBrand();
    await new Promise((resolve) => setTimeout(resolve, 20));
    pack.write(accent("#7a1f8f"), when);

    // Act
    const brand = await getBrand();

    // Assert
    expect(brand.stylesheet).toContain("--primary:#7a1f8f;");
  });

  it("keeps the last good pack when a changed pack is invalid", async () => {
    // Arrange
    pack.write(accent("#0b6b5d"), new Date(2026, 0, 1));
    const { getBrand } = await load();
    await getBrand();
    pack.write({ fonts: {} }, new Date(2026, 0, 2));

    // Act
    const brand = await getBrand();

    // Assert
    expect(brand.stylesheet).toContain("--primary:#0b6b5d;");
  });
});

describe("brandLayoutMetadata", () => {
  it("names the mounted pack and templates the titles below", async () => {
    // Arrange
    pack.write({});
    const { brandLayoutMetadata } = await load();

    // Act
    const metadata = await brandLayoutMetadata({ titleTemplate: true });

    // Assert
    expect(metadata.title).toEqual({
      default: "Example Forms",
      template: "%s | Example Forms",
    });
    expect(metadata.applicationName).toBe("Example Forms");
  });

  it("keeps the built-in name while the flag is off", async () => {
    // Arrange
    pack.write({});
    flagState.on = false;
    const { brandLayoutMetadata } = await load();

    // Act
    const metadata = await brandLayoutMetadata();

    // Assert
    expect(metadata.title).toBe("Endatix Hub");
  });
});

describe("brandTitle", () => {
  it("keeps a page's built-in title while the flag is off, and brands it with a pack", async () => {
    // Arrange
    pack.write({});
    flagState.on = false;
    const offTitle = await (
      await load()
    ).brandTitle({ page: "Form", builtIn: "Endatix Form" });
    flagState.on = true;
    const { brandTitle } = await load();

    // Act
    const onTitle = await brandTitle({ page: "Form", builtIn: "Endatix Form" });

    // Assert
    expect(offTitle).toBe("Endatix Form");
    expect(onTitle).toBe("Form | Example Forms");
  });
});

describe("pack errors at request time", () => {
  it("applies a fix that only adds the file a rejected brand.json named", async () => {
    // Arrange
    pack.write(accent("#0b6b5d"), new Date(2026, 0, 1));
    const { getBrand } = await load();
    await getBrand();
    pack.write({ assets: { icon: "icon.svg" } }, new Date(2026, 0, 2));
    await getBrand();
    writeFileSync(path.join(pack.path, "icon.svg"), "<svg/>");

    // Act
    const brand = await getBrand();

    // Assert
    expect(brand.icon).toMatch(/^\/brand\/icon\.svg\?v=/);
  });

  it.each([
    ["#ffd400", "tokens.color.primary", "light"],
    ["#0b6b5d", "tokens.color.primary-on-dark", "dark"],
  ])("warns once when %s fades into the page", async (primary, field, mode) => {
    // Arrange
    const onDark = field.endsWith("on-dark") ? "#0a1a2a" : undefined;
    pack.write({
      tokens: {
        color: {
          primary: { $type: "color", $value: primary },
          ...(onDark && {
            "primary-on-dark": { $type: "color", $value: onDark },
          }),
        },
      },
    });
    const { getBrand } = await load();

    // Act
    await getBrand();
    await getBrand();

    // Assert
    expect(telemetry.warn).toHaveBeenCalledTimes(1);
    expect(telemetry.warn.mock.calls[0][0]).toContain(field);
    expect(telemetry.warn.mock.calls[0][0]).toContain(`${mode} page`);
  });

  it("does not warn about an accent that reads", async () => {
    // Arrange
    pack.write(accent("#0b6b5d"));
    const { getBrand } = await load();

    // Act
    await getBrand();

    // Assert
    expect(telemetry.warn).not.toHaveBeenCalled();
  });

  it("serves the built-in brand and reports a pack that never validated once", async () => {
    // Arrange
    pack.write({ version: 2 });
    const { getBrand } = await load();

    // Act
    const brands = [await getBrand(), await getBrand()];

    // Assert
    expect(brands.map((brand) => brand.name)).toEqual([
      "Endatix Hub",
      "Endatix Hub",
    ]);
    expect(telemetry.error).toHaveBeenCalledTimes(1);
    expect(telemetry.error.mock.calls[0][1].message).toContain("version");
  });

  it("reports a rejected change with its field path", async () => {
    // Arrange
    pack.write(accent("#0b6b5d"), new Date(2026, 0, 1));
    const { getBrand } = await load();
    await getBrand();
    pack.write({ fonts: {} }, new Date(2026, 0, 2));

    // Act
    await getBrand();
    await getBrand();

    // Assert
    expect(telemetry.error).toHaveBeenCalledTimes(1);
    expect(telemetry.error.mock.calls[0][0]).toContain("last valid pack");
    expect(telemetry.error.mock.calls[0][1].message).toContain("fonts");
  });
});

describe("assertBrandPackAtStartup", () => {
  async function startup() {
    vi.resetModules();
    return (await import("../deployment-pack.server")).assertBrandPackAtStartup;
  }

  it("throws with the field path when the flag is on and the pack is invalid", async () => {
    // Arrange
    vi.stubEnv("FLAG_PROVIDER", "environment");
    vi.stubEnv("FLAG_WHITE_LABELING", "true");
    pack.write({ version: 2 });
    const assertBrandPackAtStartup = await startup();

    // Act
    const run = () => assertBrandPackAtStartup();

    // Assert
    expect(run).toThrow(/version/);
  });

  it("throws when PostHog decides the flag, which is unknown at start", async () => {
    // Arrange
    vi.stubEnv("FLAG_PROVIDER", "posthog");
    vi.stubEnv("FLAG_WHITE_LABELING", "false");
    vi.stubEnv("POSTHOG_PROJECT_TOKEN", "phc_test");
    pack.write({ version: 2 });
    const assertBrandPackAtStartup = await startup();

    // Act
    const run = () => assertBrandPackAtStartup();

    // Assert
    expect(run).toThrow(/version/);
  });

  it("starts and reports once when the flag is off, so the pack is ignored", async () => {
    // Arrange
    vi.stubEnv("FLAG_PROVIDER", "environment");
    vi.stubEnv("FLAG_WHITE_LABELING", "false");
    pack.write({ version: 2 });
    const assertBrandPackAtStartup = await startup();

    // Act
    const run = () => assertBrandPackAtStartup();

    // Assert
    expect(run).not.toThrow();
    expect(telemetry.error).toHaveBeenCalledTimes(1);
    expect(telemetry.error.mock.calls[0][1].message).toContain("version");
  });

  it("passes when no pack is mounted", async () => {
    // Arrange
    vi.stubEnv("FLAG_PROVIDER", "environment");
    vi.stubEnv("FLAG_WHITE_LABELING", "true");
    vi.stubEnv("ENDATIX_BRAND_DIR", "");
    const assertBrandPackAtStartup = await startup();

    // Act
    const run = () => assertBrandPackAtStartup();

    // Assert
    expect(run).not.toThrow();
  });
});
