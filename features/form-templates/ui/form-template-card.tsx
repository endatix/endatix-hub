"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormTemplate } from "@/types";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Eye, FilePen, FilePlus2, Loader2 } from "lucide-react";
import React from "react";
import { useTemplateAction } from "../application/use-template.action";
import { toast } from "@/components/ui/toast";
import { Result } from "@/lib/result";

type FormTemplateCardProps = React.ComponentProps<typeof Card> & {
  template: FormTemplate;
  isSelected: boolean;
  onPreviewClick?: (templateId: string) => void;
};

const FormTemplateCard = ({
  template,
  isSelected,
  onPreviewClick,
  className,
  ...props
}: FormTemplateCardProps) => {
  const getEnabledLabel = () => (template.isEnabled ? "Enabled" : "Disabled");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleUseTemplate = () => {
    if (!template.isEnabled) return;

    startTransition(async () => {
      // this is not a hook, but an action, so adding this rule to avoid the false eslint error
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const result = await useTemplateAction({
        templateId: template.id,
      });

      if (Result.isSuccess(result)) {
        toast.success("Form created from template successfully");
        router.push(`/forms/${result.value}`);
      } else {
        toast.error(result.message || "Failed to create form from template");
      }
    });
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onPreviewClick) {
      onPreviewClick(template.id);
    }
  };

  return (
    <Card
      className={cn(
        "flex flex-col gap-1 hover:bg-accent justify-between group",
        isSelected ? "bg-accent border-primary" : "",
        className,
      )}
      {...props}
    >
      <div className="cursor-pointer">
        <CardHeader className="flex flex-row justify-between p-4 pt-6">
          <CardTitle className="text-2xl font-normal font-sans tracking-tigher">
            {template.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-4">
          <div className="flex items-center">
            <Badge
              className="text-xs font-normal pointer-events-none ml-auto"
              variant={template.isEnabled ? "default" : "secondary"}
            >
              {getEnabledLabel()}
            </Badge>
          </div>
        </CardContent>
      </div>
      <CardFooter
        className="pb-2 p-4 bg-muted mt-auto border-t rounded-b-lg cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between w-full">
          <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <Link
              href={`/forms/templates/${template.id}`}
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center cursor-pointer"
            >
              <FilePen className="w-4 h-4 mr-1" />
              Design
            </Link>
            <button
              onClick={handlePreviewClick}
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center cursor-pointer bg-transparent border-none p-0"
            >
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </button>
            <button
              onClick={handleUseTemplate}
              disabled={!template.isEnabled || isPending}
              className={cn(
                "text-sm text-muted-foreground inline-flex items-center hover:text-foreground cursor-pointer bg-transparent border-none p-0 whitespace-nowrap",
                (!template.isEnabled || isPending) &&
                  "opacity-50 cursor-not-allowed",
              )}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <FilePlus2 className="w-4 h-4 mr-1" />
              )}
              {isPending ? "Creating..." : "Use Template"}
            </button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default FormTemplateCard;
