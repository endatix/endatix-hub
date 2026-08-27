"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { Form } from "@/types";

export async function getFormsForThemeAction(
  themeId: string,
): Promise<Result<Form[]>> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const validatedThemeId = validateEndatixId(themeId, "themeId");
  if (Result.isError(validatedThemeId)) {
    return Result.error(validatedThemeId.message);
  }

  const api = new EndatixApi(session?.accessToken);
  return toResult(
    await api.forms.list({ themeId: validatedThemeId.value, pageSize: 100 }),
    {
      mapData: (page) => [...page.items],
      fallbackMessage: "Failed to get forms for theme",
      logMessage: "Failed to get forms for theme",
      loggerName: "forms.getForTheme",
    },
  );
}
