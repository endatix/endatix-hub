"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/loaders/spinner";
import { toast } from "@/components/ui/toast";
import { ApiResult } from "@/lib/endatix-api";
import { sendTestEmailAction } from "@/features/email/application/send-test-email.action";
import { Send, Mail } from "lucide-react";
import type { EmailTemplateSummary } from "@/lib/endatix-api/email/types";

type TestEmailFormProps = {
  templates: EmailTemplateSummary[];
};

const noTemplateValue = "__none__";

export function TestEmailForm({ templates }: Readonly<TestEmailFormProps>) {
  const formRef = useRef<HTMLFormElement>(null);
  const defaultFromEmail = templates[0]?.fromAddress ?? "";
  const [selectedTemplateId, setSelectedTemplateId] = useState(noTemplateValue);
  const [fromEmail, setFromEmail] = useState(defaultFromEmail);
  const [state, formAction, isPending] = useActionState(
    sendTestEmailAction,
    null,
  );

  useEffect(() => {
    if (!state) return;

    if (ApiResult.isSuccess(state)) {
      toast.success("Test email sent successfully.");
      formRef.current?.reset();
      setSelectedTemplateId(noTemplateValue);
      setFromEmail(defaultFromEmail);
    } else {
      toast.error(state.error?.message || "Failed to send test email.");
    }
  }, [defaultFromEmail, state]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);

    const template = templates.find((item) => item.name === templateId);
    if (template) {
      setFromEmail(template.fromAddress);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Send Test Email
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="toEmail" className="text-sm font-medium">
              Recipient Email
            </label>
            <Input
              id="toEmail"
              name="toEmail"
              type="email"
              placeholder="admin@example.com"
              required
              disabled={isPending}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="fromEmail" className="text-sm font-medium">
              Sender Email
            </label>
            <Input
              id="fromEmail"
              name="fromEmail"
              type="email"
              placeholder="noreply@example.com"
              required
              disabled={isPending}
              value={fromEmail}
              onChange={(event) => setFromEmail(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="templateId" className="text-sm font-medium">
              Template (optional)
            </label>
            <Select
              name="templateId"
              disabled={isPending}
              value={selectedTemplateId}
              onValueChange={handleTemplateChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Plain text test email" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={noTemplateValue}>
                  None (plain text)
                </SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.name}>
                    <span className="flex items-center gap-2">
                      {template.name}
                      <Badge variant="outline" className="text-xs">
                        {template.fromAddress}
                      </Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={isPending} className="self-start">
            {isPending ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Sending...
              </>
            ) : (
              <>
                <Mail data-icon="inline-start" />
                Send Test Email
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
