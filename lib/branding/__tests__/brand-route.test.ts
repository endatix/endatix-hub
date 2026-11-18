import {
  mkdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { accent, mountPackDir } from "./pack-dir";

const flagState = vi.hoisted(() => ({ on: true }));

vi.mock("@/lib/feature-flags/flags", () => ({
  whiteLabelingFlag: async () => flagState.on,
}));
const telemetry = vi.hoisted(() => ({ error: vi.fn(), warn: vi.fn() }));
vi.mock("@/features/telemetry", () => ({ TelemetryLogger: telemetry }));
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
});

describe("brandRouteResponse", () => {
  const request = (headers: Record<string, string> = {}) =>
    new Request("https://hub.test/brand/x", { headers });

  it("serves the brand stylesheet at the brand.css alias", async () => {
    // Arrange
    pack.write(accent("#0b6b5d"));
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
    pack.write(accent("#0b6b5d"));
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
    pack.write({ assets: { logo: { light: "logo.svg" } } });
    writeFileSync(path.join(pack.path, "logo.svg"), "<svg/>");
    const { brandRouteResponse } = await load();

    // Act
    const light = await brandRouteResponse(["logo-light"], request());
    const dark = await brandRouteResponse(["logo-dark"], request());

    // Assert
    expect(light.headers.get("location")).toMatch(
      /^\/brand\/logo\.svg\?v=[0-9a-f]{12}$/,
    );
    expect(dark.headers.get("location")).toBe(light.headers.get("location"));
    expect(light.headers.get("cache-control")).toBe("private, no-cache");
  });

  it("serves a file the pack names, sandboxed", async () => {
    // Arrange
    pack.write({ assets: { icon: "icon.svg" } });
    writeFileSync(path.join(pack.path, "icon.svg"), "<svg/>");
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
    pack.write({ assets: { icon: "icon.svg" } });
    writeFileSync(path.join(pack.path, "icon.svg"), "<svg/>");
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
    pack.write({});
    writeFileSync(path.join(pack.path, "notes.txt"), "x");
    writeFileSync(path.join(pack.path, "icon.svg"), "<svg/>");
    const { brandRouteResponse } = await load();

    // Act
    const response = await brandRouteResponse(segments, request());

    // Assert
    expect(response.status).toBe(404);
  });

  it("does not serve pack files while the flag is off", async () => {
    // Arrange
    pack.write({ assets: { icon: "icon.svg" } });
    writeFileSync(path.join(pack.path, "icon.svg"), "<svg/>");
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
      pack.write(accent("#0b6b5d"));
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
    pack.write(accent("#0b6b5d"), new Date(2026, 0, 1));
    const { brandRouteResponse } = await load();
    const first = await brandRouteResponse(["brand.css"], request());
    pack.write(accent("#7a1f8f"), new Date(2026, 0, 2));

    // Act
    const second = await brandRouteResponse(["brand.css"], request());

    // Assert
    expect(second.headers.get("etag")).not.toBe(first.headers.get("etag"));
  });

  it("serves the current file after a ConfigMap update, even one it rejects", async () => {
    // Arrange: kubelet's layout, files linked through ..data to a timestamped folder.
    const publish = (version: string, brandJson: string, svg: string) => {
      const folder = path.join(pack.path, `..${version}`);
      mkdirSync(folder);
      writeFileSync(path.join(folder, "brand.json"), brandJson);
      writeFileSync(path.join(folder, "icon.svg"), svg);
      symlinkSync(`..${version}`, path.join(pack.path, "..data_tmp"));
      renameSync(
        path.join(pack.path, "..data_tmp"),
        path.join(pack.path, "..data"),
      );
      return folder;
    };
    const valid = JSON.stringify({
      version: 1,
      name: "Example Forms",
      assets: { icon: "icon.svg" },
    });
    const first = publish("2026_01", valid, "<svg>first</svg>");
    symlinkSync("..data/brand.json", path.join(pack.path, "brand.json"));
    symlinkSync("..data/icon.svg", path.join(pack.path, "icon.svg"));
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
    pack.write({ assets: { icon: "icon.svg" } });
    writeFileSync(path.join(pack.path, "icon.svg"), "<svg/>");
    const { brandRouteResponse, getBrand } = await load();
    await getBrand();
    rmSync(path.join(pack.path, "icon.svg"));

    // Act
    const response = await brandRouteResponse(["icon.svg"], request());

    // Assert
    expect(response.status).toBe(404);
  });

  it.each([["toString"], ["constructor"], ["__proto__"]])(
    "answers 404 for %s, which is not an alias",
    async (name) => {
      // Arrange
      pack.write({});
      const { brandRouteResponse } = await load();

      // Act
      const response = await brandRouteResponse([name], request());

      // Assert
      expect(response.status).toBe(404);
    },
  );

  it("sends a stale ?v= to the current version, uncached", async () => {
    // Arrange
    pack.write({ assets: { icon: "icon.svg" } });
    writeFileSync(path.join(pack.path, "icon.svg"), "<svg/>");
    const { brandRouteResponse, getBrand } = await load();
    const current = (await getBrand()).icon;
    const stale = new Request("https://hub.test/brand/icon.svg?v=000000000000");

    // Act
    const response = await brandRouteResponse(["icon.svg"], stale);

    // Assert
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(current);
    expect(response.headers.get("cache-control")).toBe("private, no-cache");
  });

  it("serves the current ?v= as the file", async () => {
    // Arrange
    pack.write({ assets: { icon: "icon.svg" } });
    writeFileSync(path.join(pack.path, "icon.svg"), "<svg/>");
    const { brandRouteResponse, getBrand } = await load();
    const current = new Request(`https://hub.test${(await getBrand()).icon}`);

    // Act
    const response = await brandRouteResponse(["icon.svg"], current);

    // Assert
    expect(response.status).toBe(200);
  });

  it("marks brand responses private, since the flag can differ per user", async () => {
    // Arrange
    pack.write({ ...accent("#0b6b5d"), assets: { icon: "icon.svg" } });
    writeFileSync(path.join(pack.path, "icon.svg"), "<svg/>");
    const { brandRouteResponse } = await load();

    // Act
    const responses = await Promise.all(
      [["brand.css"], ["icon.svg"], ["icon"]].map((segments) =>
        brandRouteResponse(segments, request()),
      ),
    );

    // Assert
    expect(responses.map((r) => r.headers.get("cache-control"))).toEqual([
      "private, max-age=300",
      "private, max-age=300",
      "private, no-cache",
    ]);
  });
});
