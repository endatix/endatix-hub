import type { BuildIdentity } from "@/lib/hosting/build-identity";
import type { SurveyJsVersions } from "@/lib/hosting/hub-version";

/** Null means that build is not known to this reader right now. */
export type ProductVersions = {
  readonly hub: BuildIdentity | null;
  readonly api: BuildIdentity | null;
  /** The SurveyJS libraries this Hub build ships, from the same build as `hub`. */
  readonly surveyJs: SurveyJsVersions | null;
};
