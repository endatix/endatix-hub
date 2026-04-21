"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/loaders/spinner";
import { FilePlus2 } from "lucide-react";
import { FormTemplate } from "@/types";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { runCreateFormFromTemplate } from "../application/run-create-form-from-template.client";

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
    if (!template) return;

    startCreateFormTransition(async () => {
      await runCreateFormFromTemplate(template.id, router);
    });
  };

  return (
    <Button
      className={className}
      disabled={pendingCreateForm}
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
