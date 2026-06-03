import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";
import type { EmailProviderInfo } from "@/lib/endatix-api/email/types";

type EmailSettingsCardProps = {
  provider: EmailProviderInfo;
};

export function EmailSettingsCard({
  provider,
}: Readonly<EmailSettingsCardProps>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Provider
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground">Provider</span>
            <span className="font-medium">{provider.providerName}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground">Status</span>
            {provider.isConfigured ? (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Configured
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <AlertCircle className="h-3 w-3" />
                Not Configured
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
