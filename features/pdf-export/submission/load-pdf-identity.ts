import type { Model } from "survey-core";
import {
  getClientStorageConfig,
  parseStorageObjectUrl,
} from "@/features/asset-storage/server";
import { collectRichTextImageHosts } from "@/lib/hosting/rich-text-image-hosts";
import { getMetadataBase } from "@/lib/seo/metadata-base";
import { decideImageSource } from "@/lib/utils/image-source-policy";
import { loadPdfBrand, pdfLogoPng } from "@/lib/branding/pdf.server";
import { raceWithTimeout, remainingRenderTimeoutMs } from "../render-timeout";
import { loadImageBytes } from "./downscale-pdf-images";

/** Optional images get a fraction of the remaining render budget, even on short deadlines. */
async function optionalAsset<T>(
  started: number,
  read: (signal: AbortSignal) => Promise<T>,
) {
  const budget = Math.min(
    2000,
    Math.floor(remainingRenderTimeoutMs(started) / 8),
  );
  const controller = new AbortController();
  try {
    return await raceWithTimeout(() => read(controller.signal), budget);
  } catch {
    return undefined;
  } finally {
    controller.abort();
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
) {
  const brand = await optionalAsset(started, loadPdfBrand);
  if (!brand || !model.logo) return brand;
  const logo = await optionalAsset(started, (signal) =>
    readFormLogo(model.logo, signal),
  );
  return logo ? { ...brand, logo } : brand;
}
