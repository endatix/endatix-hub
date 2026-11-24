import { readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { accent, mountPackDir } from "@/lib/branding/__tests__/pack-dir";
import { whiteLabelingFlag } from "@/lib/feature-flags/flags";
import { loadPdfIdentity } from "../load-pdf-identity";

vi.mock("node:fs/promises", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs/promises")>();
  return { ...fs, readFile: vi.fn(fs.readFile) };
});
vi.mock("@/lib/feature-flags/flags", () => ({ whiteLabelingFlag: vi.fn() }));
vi.mock("@/features/telemetry", () => ({
  TelemetryLogger: { warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/features/asset-storage/server", async () => ({
  parseStorageObjectUrl: (await import("@/features/asset-storage/utils"))
    .parseStorageObjectUrl,
  getClientStorageConfig: () => ({
    protocol: "https",
    hostName: "files.example",
    containerNames: { CONTENT: "content", USER_FILES: "files" },
  }),
}));

const pack = mountPackDir();
const svg = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="8"><rect width="16" height="8" fill="red"/></svg>',
);
const resolve = (logo = "") => loadPdfIdentity({ logo }, Date.now());

beforeEach(() => {
  vi.mocked(whiteLabelingFlag).mockResolvedValue(true);
});
afterEach(() => {
  vi.mocked(readFile).mockReset();
  vi.useRealTimers();
});

async function mountLogo(file = "light.svg", bytes = svg) {
  pack.write({
    legalName: "Example Ltd.",
    ...accent("oklch(1 0 0)"),
    assets: { logo: { light: file } },
  });
  await writeFile(path.join(pack.path, file), bytes);
}

it.each(["svg", "webp"])(
  "embeds a mounted %s logo as PNG and projects only the deployment identity",
  async (format) => {
    // Arrange
    const bytes = format === "svg" ? svg : await sharp(svg).webp().toBuffer();
    await mountLogo(`light.${format}`, bytes);

    // Act
    const identity = await resolve();

    // Assert
    expect(identity).toEqual({
      productName: "Example Forms",
      footerText: "Example Ltd.",
      accentBar: "#ffffff",
      logo: {
        kind: "wordmark",
        src: expect.stringMatching(/^data:image\/png;base64,/),
      },
    });
    const png = Buffer.from(identity!.logo!.src.split(",")[1], "base64");
    expect(await sharp(png).metadata()).toMatchObject({
      format: "png",
      width: format === "svg" ? 67 : 16,
      height: format === "svg" ? 33 : 8,
    });
  },
);

it("prefers the compact ICO over the wordmark and preserves its native bitmap", async () => {
  // Arrange: a 4-by-4 blue RGBA icon.
  const ico =
    "AAABAAEABAQAAAAAIABoAAAAFgAAACgAAAAEAAAACAAAAAEAIAAAAAAAQAAAAMQOAADEDgAAAAAAAAAAAAD/AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD/";
  await mountLogo();
  pack.write({ assets: { icon: "mark.ico", logo: { light: "light.svg" } } });
  await writeFile(path.join(pack.path, "mark.ico"), Buffer.from(ico, "base64"));

  // Act
  const identity = await resolve();

  // Assert
  expect(identity?.logo?.kind).toBe("icon");
  const png = Buffer.from(identity!.logo!.src.split(",")[1], "base64");
  expect(await sharp(png).metadata()).toMatchObject({
    format: "png",
    width: 4,
    height: 4,
  });
});

it("skips even a form logo when the deployment flag is off or no pack is mounted", async () => {
  // Arrange
  await mountLogo();
  vi.mocked(whiteLabelingFlag).mockResolvedValueOnce(false);
  const read = vi.fn();
  vi.stubGlobal("fetch", read);
  const logo = "https://files.example/content/form.webp";

  // Act & Assert
  expect(await resolve(logo)).toBeUndefined();
  vi.stubEnv("ENDATIX_BRAND_DIR", "");
  expect(await resolve(logo)).toBeUndefined();
  expect(read).not.toHaveBeenCalled();
});

it("keeps the form-logo override local to its export while a second export renders", async () => {
  // Arrange
  await mountLogo();
  const started = Promise.withResolvers<void>();
  const pending = Promise.withResolvers<Response>();
  vi.stubGlobal("fetch", () => {
    started.resolve();
    return pending.promise;
  });
  const formLogo = await sharp(svg).resize(8, 4).png().toBuffer();

  // Act
  const first = resolve("https://files.example/content/form.png");
  await started.promise;
  const second = await resolve();
  pending.resolve(
    new Response(new Uint8Array(formLogo), {
      headers: { "content-type": "image/png" },
    }),
  );
  const overridden = await first;

  // Assert
  expect(overridden).toEqual({
    ...second,
    logo: { kind: "form", src: expect.stringMatching(/^data:image\/png/) },
  });
  expect(overridden!.logo).not.toBe(second!.logo);
});

it("retains the deployment logo for an unreadable form logo", async () => {
  // Arrange
  await mountLogo();
  const expected = await resolve();

  // Act & Assert
  expect(await resolve("data:image/png;base64,AA==")).toEqual(expected);
});

it("falls through an unreadable compact mark to the full wordmark", async () => {
  // Arrange
  await mountLogo();
  await writeFile(path.join(pack.path, "mark.ico"), "invalid");
  pack.write({ assets: { icon: "mark.ico", logo: { light: "light.svg" } } });

  // Act
  const identity = await resolve();

  // Assert
  expect(identity?.logo?.kind).toBe("wordmark");
  expect(identity?.logo?.src).toMatch(/^data:image\/png/);
});

it.each(["percent", "base64"])(
  "uses the %s-encoded form SVG in the PDF header",
  async (encoding) => {
    // Arrange: unlike the 16×8 pack logo, the form logo is square.
    await mountLogo();
    const square = svg.toString().replaceAll('height="8"', 'height="16"');
    const uri =
      encoding === "percent"
        ? `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(square)}`
        : `data:image/svg+xml;base64,${Buffer.from(square).toString("base64")}`;

    // Act
    const identity = await resolve(uri);

    // Assert
    const png = Buffer.from(identity!.logo!.src.split(",")[1], "base64");
    expect(await sharp(png).metadata()).toMatchObject({
      format: "png",
      width: 16,
      height: 16,
    });
  },
);

it("keeps the pack logo if a percent-encoded form SVG is malformed or exceeds the byte limit", async () => {
  // Arrange
  await mountLogo();
  const deployment = await resolve();
  const square = svg.toString().replaceAll('height="8"', 'height="16"');
  const prefix = `data:image/svg+xml,${encodeURIComponent(square)}<!--`;
  const oversized = "é".repeat(10 * 1024 * 1024);

  // Act & Assert
  expect(await resolve(`${prefix}%ZZ-->`)).toEqual(deployment);
  expect(await resolve(`${prefix}${oversized}-->`)).toEqual(deployment);
});

it("reads an allowlisted external logo without following redirects", async () => {
  // Arrange
  await mountLogo();
  vi.stubEnv("REMOTE_IMAGE_HOSTNAMES", "art.example");
  const read = vi.fn(() =>
    Promise.resolve(
      new Response(new Uint8Array(svg), {
        headers: { "content-type": "image/svg+xml" },
      }),
    ),
  );
  vi.stubGlobal("fetch", read);

  // Act
  await resolve("https://other.example/form.svg");
  const identity = await resolve("https://art.example/form.svg");

  // Assert
  expect(identity?.logo?.kind).toBe("form");
  expect(read).toHaveBeenCalledTimes(1);
  expect(read).toHaveBeenCalledWith(
    "https://art.example/form.svg",
    expect.objectContaining({ redirect: "error" }),
  );
});

it("reserves the configured storage host for content even when it is listed as a remote host", async () => {
  // Arrange
  await mountLogo();
  vi.stubEnv("REMOTE_IMAGE_HOSTNAMES", "files.example");
  const deployment = await resolve();
  const read = vi.fn();
  vi.stubGlobal("fetch", read);

  // Act & Assert
  expect(await resolve("https://files.example/files/example.png")).toEqual(
    deployment,
  );
  expect(await resolve("https://files.example/other/example.png")).toEqual(
    deployment,
  );
  expect(read).not.toHaveBeenCalled();
});

it("retains the deployment name when a previously mounted wordmark disappears", async () => {
  // Arrange
  await mountLogo();
  expect(await resolve()).toBeDefined();
  await unlink(path.join(pack.path, "light.svg"));

  // Act & Assert
  expect(await resolve()).toEqual({
    productName: "Example Forms",
    footerText: "Example Ltd.",
    accentBar: "#ffffff",
  });
});

it("abandons a stalled pack asset early on a short render deadline", async () => {
  // Arrange
  await mountLogo();
  vi.useFakeTimers();
  vi.stubEnv("PDF_RENDER_TIMEOUT_SECONDS", "1");
  const entered = Promise.withResolvers<void>();
  const { readFile: actualRead } =
    await vi.importActual<typeof import("node:fs/promises")>(
      "node:fs/promises",
    );
  vi.mocked(readFile).mockImplementation((path, options) => {
    if (!(typeof options === "object" && options?.signal))
      return actualRead(path, options);
    entered.resolve();
    return new Promise(() => {});
  });

  // Act
  const result = resolve();
  await entered.promise;
  await vi.advanceTimersByTimeAsync(125);

  // Assert
  expect(await result).toEqual({
    productName: "Example Forms",
    footerText: "Example Ltd.",
    accentBar: "#ffffff",
  });
  expect(readFile).toHaveBeenCalledWith(expect.stringContaining("light.svg"), {
    signal: expect.objectContaining({ aborted: true }),
  });
});
