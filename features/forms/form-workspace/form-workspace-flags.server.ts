import { formAnalyticsFlag, personalizationFlag } from "@/lib/feature-flags";
import type { FormWorkspaceFlags } from "./form-workspace-sections";

export async function getFormWorkspaceFlags(): Promise<FormWorkspaceFlags> {
  const [analytics, audience] = await Promise.all([
    formAnalyticsFlag(),
    personalizationFlag(),
  ]);
  return { analytics, audience };
}
