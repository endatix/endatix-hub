import { EmailSettingsCard } from "@/features/email/ui/email-settings-card";
import { EmailTemplatesCard } from "@/features/email/ui/email-templates-card";
import { TestEmailForm } from "@/features/email/ui/test-email-form";
import type { getEmailSettings } from "../view-email-settings.server";

interface EmailSettingsPanelProps {
  settings: Awaited<ReturnType<typeof getEmailSettings>>;
}

export function EmailSettingsPanel({
  settings,
}: Readonly<EmailSettingsPanelProps>) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <EmailSettingsCard provider={settings.provider} />
        <EmailTemplatesCard templates={settings.templates} />
      </div>
      <TestEmailForm templates={settings.templates} />
    </div>
  );
}
