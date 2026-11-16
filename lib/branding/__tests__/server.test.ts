import {
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const flagState = vi.hoisted(() => ({ on: true }));

vi.mock("@/lib/feature-flags/flags", () => ({
  whiteLabelingFlag: async () => flagState.on,
}));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T>(fn: T) => fn,
}));

let dir: string;

function writePack(pack: Record<string, unknown>, mtime?: Date) {
  const file = path.join(dir, "brand.json");
  writeFileSync(
    file,
    JSON.stringify({ version: 1, name: "Example Forms", ...pack }),
  );
  if (mtime) utimesSync(file, mtime, mtime);
}

const accent = (value: string) => ({
  tokens: { color: { primary: { $type: "color", $value: value } } },
});

async function load() {
  vi.resetModules();
  return import("../server");
}

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "brand-server-"));
  flagState.on = true;
  vi.stubEnv("ENDATIX_BRAND_DIR", dir);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
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
    writePack(accent("#0b6b5d"));
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
    writePack(accent("#0b6b5d"));
    const { getBrand } = await load();

    // Act
    const brand = await getBrand();

    // Assert
    expect(brand.name).toBe("Example Forms");
    expect(brand.stylesheet).toContain("--primary:#0b6b5d;");
  });

  it("re-reads the pack when brand.json changes", async () => {
    // Arrange
    writePack(accent("#0b6b5d"), new Date(2026, 0, 1));
    const { getBrand } = await load();
    await getBrand();
    writePack(accent("#7a1f8f"), new Date(2026, 0, 2));

    // Act
    const brand = await getBrand();

    // Assert
    expect(brand.stylesheet).toContain("--primary:#7a1f8f;");
  });

  it("gives a file new URLs when only that file changes", async () => {
    // Arrange
    writePack({ assets: { icon: "icon.svg" } });
    const icon = path.join(dir, "icon.svg");
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

  it("keeps the last good pack when a changed pack is invalid", async () => {
    // Arrange
    writePack(accent("#0b6b5d"), new Date(2026, 0, 1));
    const { getBrand } = await load();
    await getBrand();
    writePack({ fonts: {} }, new Date(2026, 0, 2));

    // Act
    const brand = await getBrand();

    // Assert
    expect(brand.stylesheet).toContain("--primary:#0b6b5d;");
  });
});

describe("assertBrandPackAtStartup", () => {
  it("throws with the field path when the mounted pack is invalid", async () => {
    // Arrange
    writePack({ version: 2 });
    vi.resetModules();
    const { assertBrandPackAtStartup } =
      await import("../deployment-pack.server");

    // Act
    const run = () => assertBrandPackAtStartup();

    // Assert
    expect(run).toThrow(/version/);
  });

  it("passes when no pack is mounted", async () => {
    // Arrange
    vi.stubEnv("ENDATIX_BRAND_DIR", "");
    vi.resetModules();
    const { assertBrandPackAtStartup } =
      await import("../deployment-pack.server");

    // Act
    const run = () => assertBrandPackAtStartup();

    // Assert
    expect(run).not.toThrow();
  });
});

describe("brandRouteResponse", () => {
  const request = (headers: Record<string, string> = {}) =>
    new Request("https://hub.test/brand/x", { headers });

  it("serves the brand stylesheet at the brand.css alias", async () => {
    // Arrange
    writePack(accent("#0b6b5d"));
    const { brandRouteResponse } = await load();

    // Act
    const response = await brandRouteResponse(["brand.css"], request());

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/css; charset=utf-8",
    );
    expect(await response.text()).toContain("--primary:#0b6b5d;");
  });

  it("serves an empty brand.css and the built-in icon when the flag is off", async () => {
    // Arrange
    writePack(accent("#0b6b5d"));
    flagState.on = false;
    const { brandRouteResponse } = await load();

    // Act
    const css = await brandRouteResponse(["brand.css"], request());
    const icon = await brandRouteResponse(["icon"], request());

    // Assert
    expect(await css.text()).toBe("");
    expect(icon.status).toBe(307);
    expect(icon.headers.get("location")).toBe("/assets/icons/icon.svg");
  });

  it("redirects the logo aliases to the pack's files", async () => {
    // Arrange
    writePack({ assets: { logo: { light: "logo.svg" } } });
    writeFileSync(path.join(dir, "logo.svg"), "<svg/>");
    const { brandRouteResponse } = await load();

    // Act
    const light = await brandRouteResponse(["logo-light"], request());
    const dark = await brandRouteResponse(["logo-dark"], request());

    // Assert
    expect(light.headers.get("location")).toMatch(
      /^\/brand\/logo\.svg\?v=[0-9a-f]{12}$/,
    );
    expect(dark.headers.get("location")).toBe(light.headers.get("location"));
  });

  it("serves a file the pack names, sandboxed", async () => {
    // Arrange
    writePack({ assets: { icon: "icon.svg" } });
    writeFileSync(path.join(dir, "icon.svg"), "<svg/>");
    const { brandRouteResponse } = await load();

    // Act
    const response = await brandRouteResponse(["icon.svg"], request());

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/svg+xml");
    expect(response.headers.get("content-security-policy")).toContain(
      "sandbox",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.text()).toBe("<svg/>");
  });

  it("answers 304 when the browser has the current version", async () => {
    // Arrange
    writePack({ assets: { icon: "icon.svg" } });
    writeFileSync(path.join(dir, "icon.svg"), "<svg/>");
    const { brandRouteResponse } = await load();
    const first = await brandRouteResponse(["icon.svg"], request());

    // Act
    const second = await brandRouteResponse(
      ["icon.svg"],
      request({ "if-none-match": first.headers.get("etag")! }),
    );

    // Assert
    expect(second.status).toBe(304);
  });

  it.each([
    [["brand.json"]],
    [["..", "etc", "passwd"]],
    [["notes.txt"]],
    [["icon.svg"]],
  ])("does not serve %j when the pack does not name it", async (segments) => {
    // Arrange
    writePack({});
    writeFileSync(path.join(dir, "notes.txt"), "x");
    writeFileSync(path.join(dir, "icon.svg"), "<svg/>");
    const { brandRouteResponse } = await load();

    // Act
    const response = await brandRouteResponse(segments, request());

    // Assert
    expect(response.status).toBe(404);
  });

  it("does not serve pack files while the flag is off", async () => {
    // Arrange
    writePack({ assets: { icon: "icon.svg" } });
    writeFileSync(path.join(dir, "icon.svg"), "<svg/>");
    flagState.on = false;
    const { brandRouteResponse } = await load();

    // Act
    const response = await brandRouteResponse(["icon.svg"], request());

    // Assert
    expect(response.status).toBe(404);
  });

  it.each([['W/"{tag}"'], ['"stale", "{tag}"'], ["*"]])(
    "answers 304 to If-None-Match %s",
    async (header) => {
      // Arrange
      writePack(accent("#0b6b5d"));
      const { brandRouteResponse } = await load();
      const tag = (await brandRouteResponse(["brand.css"], request())).headers
        .get("etag")!
        .replaceAll('"', "");

      // Act
      const response = await brandRouteResponse(
        ["brand.css"],
        request({ "if-none-match": header.replace("{tag}", tag) }),
      );

      // Assert
      expect(response.status).toBe(304);
    },
  );

  it("gives brand.css a new tag when its content changes", async () => {
    // Arrange
    writePack(accent("#0b6b5d"), new Date(2026, 0, 1));
    const { brandRouteResponse } = await load();
    const first = await brandRouteResponse(["brand.css"], request());
    writePack(accent("#7a1f8f"), new Date(2026, 0, 2));

    // Act
    const second = await brandRouteResponse(["brand.css"], request());

    // Assert
    expect(second.headers.get("etag")).not.toBe(first.headers.get("etag"));
  });

  it("serves the current file after a ConfigMap update, even one it rejects", async () => {
    // Arrange: kubelet's layout, files linked through ..data to a timestamped folder.
    const publish = (version: string, brandJson: string, svg: string) => {
      const folder = path.join(dir, `..${version}`);
      mkdirSync(folder);
      writeFileSync(path.join(folder, "brand.json"), brandJson);
      writeFileSync(path.join(folder, "icon.svg"), svg);
      symlinkSync(`..${version}`, path.join(dir, "..data_tmp"));
      renameSync(path.join(dir, "..data_tmp"), path.join(dir, "..data"));
      return folder;
    };
    const valid = JSON.stringify({
      version: 1,
      name: "Example Forms",
      assets: { icon: "icon.svg" },
    });
    const first = publish("2026_01", valid, "<svg>first</svg>");
    symlinkSync("..data/brand.json", path.join(dir, "brand.json"));
    symlinkSync("..data/icon.svg", path.join(dir, "icon.svg"));
    const { brandRouteResponse } = await load();
    await brandRouteResponse(["icon.svg"], request());
    publish(
      "2026_02",
      JSON.stringify({ version: 2, name: "x" }),
      "<svg>second</svg>",
    );
    rmSync(first, { recursive: true, force: true });

    // Act
    const response = await brandRouteResponse(["icon.svg"], request());

    // Assert
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("<svg>second</svg>");
  });

  it("answers 404, not an error, when a named file has gone", async () => {
    // Arrange
    writePack({ assets: { icon: "icon.svg" } });
    writeFileSync(path.join(dir, "icon.svg"), "<svg/>");
    const { brandRouteResponse, getBrand } = await load();
    await getBrand();
    rmSync(path.join(dir, "icon.svg"));

    // Act
    const response = await brandRouteResponse(["icon.svg"], request());

    // Assert
    expect(response.status).toBe(404);
  });
});
