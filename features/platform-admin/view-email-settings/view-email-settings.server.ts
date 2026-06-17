import { EndatixApi, ApiResult } from "@/lib/endatix-api";
import type {
  EmailProviderInfo,
  EmailTemplateSummary,
} from "@/lib/endatix-api/email/types";
import { requirePlatformAdmin } from "../server";

export async function getEmailSettings() {
  const session = await requirePlatformAdmin();
  const api = new EndatixApi(session?.accessToken);
  const [providerResult, templatesResult] = await Promise.all([
    api.email.getProviderSettings(),
    api.email.getTemplates(),
  ]);

  const provider: EmailProviderInfo = ApiResult.isSuccess(providerResult)
    ? providerResult.data
    : { providerName: "Unknown", isConfigured: false };
  const templates: EmailTemplateSummary[] = ApiResult.isSuccess(templatesResult)
    ? templatesResult.data
    : [];

  return {
    provider,
    templates,
  };
}
