import { auth } from "@/auth";
import { SectionTitle } from "@/components/headings/section-title";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { Result, toResult } from "@/lib/result";
import { PdfThemeSwitch } from "./pdf-theme-switch";

async function loadSettings(formId: string) {
  const session = await auth();
  const { checkAllPermissions } = await authorization(session);
  const edit = await checkAllPermissions([
    Permissions.Forms.View,
    Permissions.Forms.Edit,
  ]);
  if (!edit.success) return null;
  const api = new EndatixApi(session?.accessToken);
  return toResult(await api.forms.getSettings(formId), {
    fallbackMessage: "Could not load PDF settings.",
    logMessage: "PDF settings read failed.",
    loggerName: "forms.pdf-settings",
  });
}

export async function PdfSettingsSection({ formId }: Readonly<{ formId: string }>) {
  const result = await loadSettings(formId);
  if (!result) return null;
  // Earlier API versions do not serve the settings sub-resource.
  if (Result.isError(result) && result.statusCode === 404) return null;
  return (
    <section className="mx-auto max-w-2xl space-y-3 py-4">
      <SectionTitle title="Submission PDFs" headingClassName="text-xl" />
      {Result.isError(result) ? (
        <p>{result.message}</p>
      ) : (
        <PdfThemeSwitch formId={formId} settings={result.value} />
      )}
    </section>
  );
}
