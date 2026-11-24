import type { Model } from "survey-core";
import {
  getClientStorageConfig,
  parseStorageObjectUrl,
} from "@/features/asset-storage/server";
import { collectRichTextImageHosts } from "@/lib/hosting/rich-text-image-hosts";
import { getMetadataBase } from "@/lib/seo/metadata-base";
import { decideImageSource } from "@/lib/utils/image-source-policy";
import {
  loadPdfBrand,
  pdfLogoPng,
  type PdfBrandIdentity,
  type PdfLogoCandidate,
} from "@/lib/branding/pdf.server";
import { raceWithTimeout, remainingRenderTimeoutMs } from "../render-timeout";
import { loadImageBytes } from "./downscale-pdf-images";

/** Optional images get a fraction of the remaining render budget, even on short deadlines. */
function assetBudget(started: number) {
  return Math.min(2000, Math.floor(remainingRenderTimeoutMs(started) / 8));
}

async function optionalAsset<T>(
  budget: number,
  read: (signal: AbortSignal) => Promise<T>,
) {
  const controller = new AbortController();
  try {
    return await raceWithTimeout(() => read(controller.signal), budget);
  } catch {
    return undefined;
  } finally {
    controller.abort();
  }
}

async function firstUsableLogo(candidates: PdfLogoCandidate[], budget: number) {
  const deadline = Date.now() + budget;
  for (const [index, { kind, read }] of candidates.entries()) {
    // A slow form logo or icon must leave time for the remaining fallbacks.
    const share = (deadline - Date.now()) / (candidates.length - index);
    const src = await optionalAsset(Math.floor(share), read);
    if (src) return { kind, src };
  }
}

function canReadFormLogo(source: string) {
  if (source.startsWith("data:image/")) return true;
  const storage = getClientStorageConfig();
  const url = URL.parse(source);
  if (!url) return false;
  const storageOrigin = URL.parse(`${storage.protocol}://${storage.hostName}`);
  if (storageOrigin && hostname(url) === hostname(storageOrigin)) {
    return (
      url.origin === storageOrigin.origin &&
      !url.username &&
      !url.password &&
      parseStorageObjectUrl(source, storage)?.containerType === "CONTENT"
    );
  }
  return isAllowedRemoteLogo(source);
}

function isAllowedRemoteLogo(source: string) {
  return (
    decideImageSource(source, {
      allowedHosts: collectRichTextImageHosts([]),
      ownOrigin: getMetadataBase().origin,
    }).kind === "keep"
  );
}

function hostname(url: URL) {
  return url.hostname.toLowerCase().replace(/\.$/, "");
}

async function readFormLogo(source: string, signal: AbortSignal) {
  if (!canReadFormLogo(source)) return;
  const bytes = await loadImageBytes(source, { signal, redirect: "error" });
  if (bytes && !signal.aborted) return pdfLogoPng(bytes);
}

export async function loadPdfIdentity(
  model: Pick<Model, "logo">,
  started: number,
): Promise<PdfBrandIdentity | undefined> {
  const brand = await optionalAsset(assetBudget(started), loadPdfBrand);
  if (!brand) return;
  const { identity, candidates } = brand;
  if (model.logo)
    candidates.unshift({
      kind: "form",
      read: (signal) => readFormLogo(model.logo, signal),
    });
  const logo = await firstUsableLogo(candidates, assetBudget(started));
  return { ...identity, logo };
}
