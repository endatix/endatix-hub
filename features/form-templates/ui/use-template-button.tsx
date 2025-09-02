"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/loaders/spinner";
import { FilePlus2 } from "lucide-react";
import { FormTemplate } from "@/types";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTemplateAction } from "../application/use-template.action";
import { Result } from "@/lib/result";
import { toast } from "@/components/ui/toast";

interface UseTemplateButtonProps {
  template: FormTemplate | null;
  className?: string;
  variant?: "default" | "outline" | "secondary";
}

export function UseTemplateButton({
  template,
  className,
  variant = "default",
}: UseTemplateButtonProps) {
  const [pendingCreateForm, startCreateFormTransition] = useTransition();
  const router = useRouter();

  const handleUseTemplate = () => {
    if (!template?.isEnabled) return;

    startCreateFormTransition(async () => {
      // this is not a hook, but an action, so adding this rule to avoid the false eslint error
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const result = await useTemplateAction({
        templateId: template.id,
      });

      if (Result.isSuccess(result)) {
        toast.success("Form created from template successfully");
        router.push(`/forms/${result.value}/designer`);
      } else {
        toast.error(result.message || "Failed to create form from template");
      }
    });
  };

  return (
    <Button
      className={className}
      disabled={!template?.isEnabled || pendingCreateForm}
      variant={variant}
      onClick={handleUseTemplate}
    >
      {pendingCreateForm ? (
        <Spinner className="w-4 h-4 mr-1" />
      ) : (
        <FilePlus2 className="w-4 h-4 mr-1" />
      )}
      {pendingCreateForm ? "Creating..." : "Use Template"}
    </Button>
  );
}
