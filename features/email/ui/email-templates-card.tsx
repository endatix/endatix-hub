import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import type { EmailTemplateSummary } from "@/lib/endatix-api/email/types";

type EmailTemplatesCardProps = {
  templates: EmailTemplateSummary[];
};

export function EmailTemplatesCard({
  templates,
}: Readonly<EmailTemplatesCardProps>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Available Email Templates ({templates.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No email templates registered.
          </p>
        ) : (
          <div className="grid gap-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-sm font-medium">
                    {template.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {template.subject}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {template.fromAddress}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
