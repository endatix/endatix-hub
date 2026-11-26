import {
  formAnalyticsFlag,
  personalizationFlag,
  reportingExportFlag,
} from "@/lib/feature-flags/flags";
import type { RequiredAction } from "@/lib/endatix-api/auth/required-action";
import { resolverFeature } from "@/lib/routes/optional-resolver";
import { resolverPath } from "@/lib/routes/resolve-target";

const flags = {
  analytics: formAnalyticsFlag,
  audience: personalizationFlag,
  reporting: reportingExportFlag,
};

export async function resolverAvailable(path: string) {
  const feature = resolverFeature(path);
  return !feature || (await flags[feature]());
}

/** Keep the obligation when its optional resolver is unavailable, but do not offer a dead link. */
export async function availableResolvers(actions: RequiredAction[]) {
  return Promise.all(
    actions.map(async (action) => {
      const href = resolverPath(action);
      return href && !(await resolverAvailable(href))
        ? { ...action, resolvePath: "" }
        : action;
    }),
  );
}
