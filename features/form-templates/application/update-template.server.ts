import { auth } from "@/auth";
import { EndatixApi } from "@/lib/endatix-api";
import type { PartialUpdateFormTemplateRequest } from "@/lib/endatix-api/form-templates/form-templates";
import { toResult } from "@/lib/result";

export async function updateTemplate(
  templateId: string,
  changes: PartialUpdateFormTemplateRequest,
) {
  const api = new EndatixApi((await auth())?.accessToken);
  return toResult<void, string>(
    await api.formTemplates.partialUpdate(templateId, changes),
    {
      mapData: () => templateId,
      fallbackMessage: "Failed to update template",
      logMessage: "Failed to update template",
      loggerName: "form-templates.update",
    },
  );
}
