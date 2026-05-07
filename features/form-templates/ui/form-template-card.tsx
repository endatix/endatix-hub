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
import { Eye, FilePen, FilePlus2, Loader2, MoreVertical } from "lucide-react";
import React, { useState } from "react";
import { runCreateFormFromTemplate } from "../application/run-create-form-from-template.client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoveTemplateToFolderMenuItem } from "@/features/folders/move-template-to-folder";

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();

  const handleUseTemplate = () => {
    startTransition(async () => {
      await runCreateFormFromTemplate(template.id, router);
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
        "group flex h-[230px] w-full max-w-full min-w-[420px] flex-col gap-0 py-0",
        isSelected ? "border-primary bg-accent" : "",
        className,
      )}
      {...props}
    >
      <div className="flex min-h-0 min-w-0 flex-1 cursor-pointer flex-col rounded-t-md transition-colors group-hover:bg-muted/45">
        <CardHeader className="shrink-0 p-4 pt-4 pb-2">
          <CardTitle
            title={template.name}
            className="tracking-tigher line-clamp-2 min-w-0 font-sans text-2xl leading-snug font-normal break-words"
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
        <div className="flex h-full w-full min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 flex-nowrap items-center gap-x-3 overflow-x-auto overflow-y-hidden opacity-0 transition-opacity group-hover:opacity-100">
            <Link
              href={`/forms/templates/${template.id}`}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-sm leading-none whitespace-nowrap text-muted-foreground hover:text-foreground"
            >
              <FilePen className="size-4 shrink-0" />
              Design
            </Link>
            <button
              type="button"
              onClick={handlePreviewClick}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-sm leading-none whitespace-nowrap text-muted-foreground hover:text-foreground"
            >
              <Eye className="size-4 shrink-0" />
              Preview
            </button>
            <button
              type="button"
              onClick={handleUseTemplate}
              disabled={isPending}
              className={cn(
                "inline-flex shrink-0 cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-sm leading-none whitespace-nowrap text-muted-foreground hover:text-foreground",
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
          <div className="relative flex h-full shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
            <DropdownMenu
              open={isDropdownOpen}
              onOpenChange={setIsDropdownOpen}
            >
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="size-4" />
                  <span className="sr-only">More options</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top">
                <MoveTemplateToFolderMenuItem
                  templateId={template.id}
                  currentFolderId={template.folderId}
                  onActionHandled={() => setIsDropdownOpen(false)}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default FormTemplateCard;
