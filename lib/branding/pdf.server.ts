import "server-only";

import { readFile } from "node:fs/promises";
import decodeIco from "decode-ico";
import sharp, { type Raw } from "sharp";
import { toHex } from "./color";
import { resolveDeploymentBrand } from "./effective-brand.server";
import { packColor } from "./layers";
import { locatePackFile, type LoadedBrandPack } from "./read-pack";

export interface PdfBrandIdentity {
  productName: string;
  footerText: string;
  accentBar?: string;
  logo?: string;
}

/** Preserve transparency and aspect ratio; never hand a URL to the PDF renderer. */
export async function pdfLogoPng(
  bytes: Buffer,
  raw?: Raw,
): Promise<string> {
  const png = await sharp(bytes, { limitInputPixels: 16_000_000, raw })
    .rotate()
    .resize({
      width: 480,
      height: 144,
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
  return pdfLogoPng(Buffer.from(frame.data), raw);
}

async function readPackLogo(pack: LoadedBrandPack, signal: AbortSignal) {
  const name = pack.pack.assets?.logo?.light;
  if (!name) return;
  const file = locatePackFile(pack.dir, name);
  if (typeof file !== "string") throw new Error("Pack logo unavailable");
  const bytes = await readFile(file, { signal });
  return name.toLowerCase().endsWith(".ico")
    ? packIconPng(bytes)
    : pdfLogoPng(bytes);
}

/** Only this adapter knows where an export's identity comes from. */
export async function loadPdfBrand(
  signal: AbortSignal,
): Promise<PdfBrandIdentity | undefined> {
  const { brand, pack } = await resolveDeploymentBrand();
  if (!pack || signal.aborted) return;
  const color = packColor(pack.pack.tokens?.color);
  return {
    productName: brand.name,
    footerText: brand.legalName,
    accentBar: color ? toHex(color.primary) : undefined,
    logo: await readPackLogo(pack, signal),
  };
}
