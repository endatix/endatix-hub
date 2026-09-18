import { EndatixApi } from "@/lib/endatix-api";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";

/**
 * Theme JSON for a PDF. Prefers `formDefinition.themeModel` already on the
 * submission; otherwise GET `/forms/{id}/definition`. Failure → undefined so
 * the brochure uses DEFAULT_PDF_THEME (Endatix Hub light palette).
 */
export async function loadFormThemeJson({
  formId,
  embeddedThemeJson,
  accessToken,
}: {
  formId: string;
  embeddedThemeJson?: string | null;
  accessToken?: string;
}): Promise<string | undefined> {
  const embedded = embeddedThemeJson?.trim();
  if (embedded) {
    return embedded;
  }

  const api = new EndatixApi(accessToken);
  const result = await api.definitions.getActive(formId, {
    requireAuth: Boolean(accessToken),
  });

  if (!ApiResult.isSuccess(result)) {
    return undefined;
  }

  const themeModel = result.data.themeModel?.trim();
  return themeModel ? themeModel : undefined;
}
