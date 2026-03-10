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
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleUseTemplate = () => {
    startTransition(async () => {
      // this is not a hook, but an action, so adding this rule to avoid the false eslint error
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const result = await useTemplateAction({
        templateId: template.id,
      });

      if (Result.isSuccess(result)) {
        toast.success("Form created from template successfully");
        router.push(`/forms/${result.value}/design`);
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
        "group flex min-w-[280px] flex-col justify-between gap-1 py-0 hover:bg-accent",
        isSelected ? "border-primary bg-accent" : "",
        className,
      )}
      {...props}
    >
      <div className="min-w-0 cursor-pointer">
        <CardHeader className="flex flex-row justify-between p-4 pt-6">
          <CardTitle className="tracking-tigher min-w-0 font-sans text-2xl font-normal">
            {template.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-4">
          <p className="text-sm text-muted-foreground truncate">
            {template.description}
          </p>
        </CardContent>
      </div>
      <CardFooter
        className="mt-auto flex cursor-default items-center rounded-b-lg border-t bg-muted p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex w-full items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100">
          <Link
            href={`/forms/templates/${template.id}`}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <FilePen className="size-4" />
            Design
          </Link>
          <button
            onClick={handlePreviewClick}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-sm text-muted-foreground hover:text-foreground"
          >
            <Eye className="size-4" />
            Preview
          </button>
          <button
            onClick={handleUseTemplate}
            disabled={isPending}
            className={cn(
              "inline-flex shrink-0 cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-sm text-muted-foreground hover:text-foreground",
              isPending && "cursor-not-allowed opacity-50",
            )}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FilePlus2 className="size-4" />
            )}
            <span className="whitespace-nowrap">
              {isPending ? "Creating..." : "Use Template"}
            </span>
          </button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default FormTemplateCard;
