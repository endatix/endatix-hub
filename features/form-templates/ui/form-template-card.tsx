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
        "group flex h-[230px] min-w-[420px] w-full max-w-full flex-col gap-0 py-0 hover:bg-accent",
        isSelected ? "border-primary bg-accent" : "",
        className,
      )}
      {...props}
    >
      <div className="flex min-h-0 min-w-0 flex-1 cursor-pointer flex-col">
        <CardHeader className="shrink-0 p-4 pt-4 pb-2">
          <CardTitle
            title={template.name}
            className="line-clamp-2 min-w-0 break-words font-sans text-2xl font-normal leading-snug tracking-tigher"
          >
            {template.name}
          </CardTitle>
        </CardHeader>
        <div className="min-h-0 flex-1 shrink" aria-hidden />
        <CardContent className="shrink-0 p-4 pt-2">
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {template.description}
          </p>
        </CardContent>
      </div>
      <CardFooter
        className="mt-auto flex h-16 min-w-0 cursor-default items-center overflow-hidden rounded-b-[6px] border-t bg-muted px-4 py-0 [.border-t]:pt-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-full w-full min-w-0 flex-nowrap items-center gap-x-3 overflow-x-auto overflow-y-hidden opacity-0 transition-opacity group-hover:opacity-100">
          <Link
            href={`/forms/templates/${template.id}`}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap text-sm leading-none text-muted-foreground hover:text-foreground"
          >
            <FilePen className="size-4 shrink-0" />
            Design
          </Link>
          <button
            type="button"
            onClick={handlePreviewClick}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap border-none bg-transparent p-0 text-sm leading-none text-muted-foreground hover:text-foreground"
          >
            <Eye className="size-4 shrink-0" />
            Preview
          </button>
          <button
            type="button"
            onClick={handleUseTemplate}
            disabled={isPending}
            className={cn(
              "inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap border-none bg-transparent p-0 text-sm leading-none text-muted-foreground hover:text-foreground",
              isPending && "cursor-not-allowed opacity-50",
            )}
          >
            {isPending ? (
              <Loader2 className="size-4 shrink-0 animate-spin" />
            ) : (
              <FilePlus2 className="size-4 shrink-0" />
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
