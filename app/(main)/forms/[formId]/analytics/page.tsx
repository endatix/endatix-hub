import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { redirect } from "next/navigation";
import { FormWorkspaceHeader } from "@/features/forms/form-workspace";
import { getFormWorkspaceFlags } from "@/features/forms/form-workspace/form-workspace-flags.server";
import { loadWorkspaceForm } from "@/features/forms/form-workspace/load-workspace-form.server";
import { FormLoadError } from "@/features/forms/form-workspace/ui/form-load-error";
import { SurveyDashboardWrapper } from "@/features/form-analytics/ui/survey-dashboard-wrapper";
import { getSurveyLicenseKey } from "@/features/config/server";
import { SurveyLicenseProvider } from "@/features/config/survey-license-provider";
import { Result } from "@/lib/result";

type Params = {
  params: Promise<{ formId: string }>;
};

export default async function FormAnalyticsPage({ params }: Readonly<Params>) {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const { formId } = await params;
  const flags = await getFormWorkspaceFlags();
  if (!flags.analytics) return redirect(`/forms/${formId}`);

  const form = await loadWorkspaceForm(formId, "analytics");
  if (Result.isError(form)) return <FormLoadError result={form} />;

  return (
    <div className="container py-6">
      <FormWorkspaceHeader
        title="Analytics"
        description="Survey analytics and charts (v1: mocked data)."
      />
      {/* disabled for now until we add subission JSON data via the API */}
      <SurveyLicenseProvider value={getSurveyLicenseKey()}>
        <SurveyDashboardWrapper surveyJson={null} />
      </SurveyLicenseProvider>
    </div>
  );
}
