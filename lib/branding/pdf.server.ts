import "server-only";

import { readFile } from "node:fs/promises";
import decodeIco from "decode-ico";
import sharp, { type SharpOptions } from "sharp";
import { toHex } from "./color";
import { resolveDeploymentBrand } from "./effective-brand.server";
import { packColor } from "./layers";
import { locatePackFile, type LoadedBrandPack } from "./read-pack";

export interface PdfBrandIdentity {
  productName: string;
  footerText: string;
  accentBar?: string;
  logo?: { kind: "form" | "icon" | "wordmark"; src: string };
}

export interface PdfLogoCandidate {
  kind: NonNullable<PdfBrandIdentity["logo"]>["kind"];
  read: (signal: AbortSignal) => Promise<string | undefined>;
}

const LOGO_SIZE = { width: 480, height: 144 };
const MAX_INPUT_PIXELS = 16_000_000;

/** Preserve transparency and aspect ratio; never hand a URL to the PDF renderer. */
export async function pdfLogoPng(
  bytes: Buffer,
  options?: Pick<SharpOptions, "raw" | "density">,
): Promise<string> {
  const png = await sharp(bytes, {
    limitInputPixels: MAX_INPUT_PIXELS,
    ...options,
  })
    .rotate()
    .resize({
      ...LOGO_SIZE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .timeout({ seconds: 1 })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

/** ICO wraps PNG or Windows bitmap frames; sharp does not read the container. */
function packIconPng(bytes: Buffer) {
  if (bytes.length > 1024 * 1024 || bytes.readUInt16LE(4) > 16)
    throw new Error("Pack icon too large");
  const [frame] = decodeIco(bytes).sort((a, b) => b.width - a.width);
  const raw =
    frame.type === "bmp"
      ? { width: frame.width, height: frame.height, channels: 4 as const }
      : undefined;
  return pdfLogoPng(Buffer.from(frame.data), { raw });
}

async function packSvgPng(bytes: Buffer, signal: AbortSignal) {
  const { width, height } = await sharp(bytes, {
    limitInputPixels: MAX_INPUT_PIXELS,
  }).metadata();
  if (signal.aborted) return;
  // With fit: "inside", either dimension at the output bound is enough detail.
  const density =
    width < LOGO_SIZE.width && height < LOGO_SIZE.height ? 300 : 72;
  return pdfLogoPng(bytes, { density });
}

async function readPdfPackImage(
  pack: LoadedBrandPack,
  name: string,
  signal: AbortSignal,
) {
  const file = await locatePackFile(pack.dir, name);
  if (typeof file !== "string") return;
  const bytes = await readFile(file, { signal });
  const filename = name.toLowerCase();
  if (filename.endsWith(".svg")) return packSvgPng(bytes, signal);
  return filename.endsWith(".ico")
    ? packIconPng(bytes)
    : pdfLogoPng(bytes, { density: 300 });
}

function packLogoCandidates(pack: LoadedBrandPack): PdfLogoCandidate[] {
  const assets = pack.pack.assets;
  const files = [
    ["icon", assets?.icon],
    ["wordmark", assets?.logo?.light],
  ] as const;
  return files.flatMap(([kind, name]) =>
    name
      ? [
          {
            kind,
            read: (signal: AbortSignal) => readPdfPackImage(pack, name, signal),
          },
        ]
      : [],
  );
}

/** Only this adapter knows where an export's identity comes from. */
export async function loadPdfBrand(signal: AbortSignal) {
  const { brand, pack } = await resolveDeploymentBrand();
  if (!pack || signal.aborted) return;
  const color = packColor(pack.pack.tokens?.color);
  const identity: PdfBrandIdentity = {
    productName: brand.name,
    footerText: brand.legalName,
    accentBar: color ? toHex(color.primary) : undefined,
  };
  return { identity, candidates: packLogoCandidates(pack) };
}
