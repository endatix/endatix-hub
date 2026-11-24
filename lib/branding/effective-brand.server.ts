import "server-only";

import { whiteLabelingFlag } from "@/lib/feature-flags/flags";
import { withBasePath } from "@/lib/hosting";
import type { Brand } from "./index";
import { currentDeploymentPack } from "./deployment-pack.server";
import { BUILT_IN_LAYER, mergeBrand, packLayer } from "./layers";
import type { LoadedBrandPack } from "./read-pack";

export const BUILT_IN_BRAND: Brand = mergeBrand([BUILT_IN_LAYER]);

export interface DeploymentBrand {
  readonly brand: Brand;
  /** Null: the built-in brand applies (no pack, or the flag is off). */
  readonly pack: LoadedBrandPack | null;
}

let memo: { readonly fingerprint: string; readonly brand: Brand } | null = null;

/** The deployment layer over the built-in brand. Never throws. */
export async function resolveDeploymentBrand(): Promise<DeploymentBrand> {
  if (!(await whiteLabelingFlag()))
    return { brand: BUILT_IN_BRAND, pack: null };

  const pack = await currentDeploymentPack();
  if (pack === null) return { brand: BUILT_IN_BRAND, pack: null };

  if (memo?.fingerprint !== pack.fingerprint) {
    const layer = packLayer(pack.pack, (file) =>
      packFileUrl(file, pack.fingerprint),
    );
    memo = {
      fingerprint: pack.fingerprint,
      brand: mergeBrand([layer, BUILT_IN_LAYER]),
    };
  }
  return { brand: memo.brand, pack };
}

/** `/brand/<file>?v=<fingerprint>`: a changed pack gets new URLs, so caches never mix versions. */
export function packFileUrl(file: string, fingerprint: string): string {
  const encoded = file
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const route = withBasePath(`/brand/${encoded}`);
  return `${route}?v=${fingerprint}`;
}
