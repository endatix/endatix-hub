import { cache } from "react";
import { auth } from "@/auth";
import { EndatixApi } from "@/lib/endatix-api";
import { toResult, type Result } from "@/lib/result";
import type { Form } from "@/types";

/** One form read per request, shared by the header slot, metadata and the page body. */
export const getWorkspaceForm = cache(async (formId: string) => {
  const session = await auth();
  return new EndatixApi(session?.accessToken).forms.get(formId);
});

/** The form a page of the workspace shows, as a `Result` the page turns into its error view. */
export async function loadWorkspaceForm(
  formId: string,
  page: string,
): Promise<Result<Form>> {
  return toResult(await getWorkspaceForm(formId), {
    fallbackMessage: "Failed to load form.",
    logMessage: `Failed to load form for ${page}.`,
    loggerName: `forms.${page}`,
  });
}
