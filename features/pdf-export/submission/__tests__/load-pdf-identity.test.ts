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
      logo: expect.stringMatching(/^data:image\/png;base64,/),
    });
    const png = Buffer.from(identity!.logo!.split(",")[1], "base64");
    expect(await sharp(png).metadata()).toMatchObject({
      format: "png",
      width: 16,
      height: 8,
    });
  },
);

it("renders a Windows bitmap frame from a pack ICO", async () => {
  // Arrange: a 4-by-4 blue RGBA icon.
  const ico =
    "AAABAAEABAQAAAAAIABoAAAAFgAAACgAAAAEAAAACAAAAAEAIAAAAAAAQAAAAMQOAADEDgAAAAAAAAAAAAD/AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD/";
  await mountLogo("logo.ico", Buffer.from(ico, "base64"));

  // Act
  const identity = await resolve();

  // Assert
  const png = Buffer.from(identity!.logo!.split(",")[1], "base64");
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
    logo: expect.stringMatching(/^data:image\/png/),
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
  expect(identity?.logo).toMatch(/^data:image\/png/);
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

it("drops the whole identity when a previously mounted logo disappears", async () => {
  // Arrange
  await mountLogo();
  expect(await resolve()).toBeDefined();
  await unlink(path.join(pack.path, "light.svg"));

  // Act & Assert
  expect(await resolve()).toBeUndefined();
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
  expect(await result).toBeUndefined();
  expect(readFile).toHaveBeenCalledWith(expect.stringContaining("light.svg"), {
    signal: expect.objectContaining({ aborted: true }),
  });
});
