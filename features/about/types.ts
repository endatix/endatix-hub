import type { BuildIdentity } from "@/lib/hosting/build-identity";

/** Null means that build is not known to this reader right now. */
export type ProductVersions = {
  readonly hub: BuildIdentity | null;
  readonly api: BuildIdentity | null;
};
