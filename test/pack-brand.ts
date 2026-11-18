import type { Brand } from "@/lib/branding";
import { BUILT_IN_LAYER, mergeBrand, packLayer } from "@/lib/branding/layers";
import { BrandPackSchema } from "@/lib/branding/schema";

/** A brand pack named "Example Forms" over the built-in brand, with `fields` on top. */
export function packBrand(fields: Record<string, unknown> = {}): Brand {
  const pack = BrandPackSchema.parse({
    version: 1,
    name: "Example Forms",
    ...fields,
  });
  return mergeBrand([packLayer(pack, (file) => file), BUILT_IN_LAYER]);
}
