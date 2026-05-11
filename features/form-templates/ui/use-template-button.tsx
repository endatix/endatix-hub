"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/loaders/spinner";
import { FilePlus2 } from "lucide-react";
import { FormTemplate } from "@/types";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { runCreateFormFromTemplate } from "../application/run-create-form-from-template.client";
import { toast } from "@/components/ui/toast";

interface UseTemplateButtonProps {
  template: FormTemplate | null;
  className?: string;
  variant?: "default" | "outline" | "secondary";
  requireFolderAssignment?: boolean;
}

export function UseTemplateButton({
  template,
  className,
  variant = "default",
  requireFolderAssignment = false,
}: UseTemplateButtonProps) {
  const [pendingCreateForm, startCreateFormTransition] = useTransition();
  const router = useRouter();

  const handleUseTemplate = () => {
    if (!template) return;
    if (requireFolderAssignment) {
      toast.info({
        title: "Folder selection is required",
        description: "Use Create a Form flow to select a folder first.",
      });
      return;
    }

    startCreateFormTransition(async () => {
      await runCreateFormFromTemplate(template.id, router);
    });
  };

  return (
    <Button
      className={className}
      disabled={pendingCreateForm || requireFolderAssignment}
      variant={variant}
      onClick={handleUseTemplate}
      title={
        requireFolderAssignment
          ? "Folder selection is required. Use Create a Form."
          : undefined
      }
    >
      {pendingCreateForm ? (
        <Spinner className="mr-1 h-4 w-4" />
      ) : (
        <FilePlus2 className="mr-1 h-4 w-4" />
      )}
      {pendingCreateForm ? "Creating..." : "Use Template"}
    </Button>
  );
}
