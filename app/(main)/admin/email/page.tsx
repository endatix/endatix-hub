import { requireAdmin } from "@/components/admin-ui/admin-protection";
import { auth } from "@/auth";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { Mail } from "lucide-react";
import { EmailSettingsCard } from "@/features/email/ui/email-settings-card";
import { EmailTemplatesCard } from "@/features/email/ui/email-templates-card";
import { TestEmailForm } from "@/features/email/ui/test-email-form";
import type { EmailProviderInfo, EmailTemplateSummary } from "@/lib/endatix-api/email/types";

export default async function EmailSettingsPage() {
  await requireAdmin();

  const session = await auth();
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

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="mb-6 flex items-center gap-2">
        <Mail className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Email Settings</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <EmailSettingsCard provider={provider} />
        <EmailTemplatesCard templates={templates} />
      </div>

      <TestEmailForm templates={templates} />
    </div>
  );
}
