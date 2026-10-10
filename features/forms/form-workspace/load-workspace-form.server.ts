import { auth } from "@/auth";
import { EndatixApi } from "@/lib/endatix-api";
import { toResult, type Result } from "@/lib/result";
import type { Form } from "@/types";

/** The form a page of the workspace shows, as a `Result` the page turns into its error view. */
export async function loadWorkspaceForm(
  formId: string,
  page: string,
): Promise<Result<Form>> {
  const session = await auth();
  return toResult(
    await new EndatixApi(session?.accessToken).forms.get(formId),
    {
      fallbackMessage: "Failed to load form.",
      logMessage: `Failed to load form for ${page}.`,
      loggerName: `forms.${page}`,
    },
  );
}
