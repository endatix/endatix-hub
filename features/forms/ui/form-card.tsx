"use client";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form } from "@/types";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { FilePen, Globe, Link2, List, Lock, MoreVertical, Save } from "lucide-react";
import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type FormCardProps = React.ComponentProps<typeof Card> & {
  form: Form;
  isSelected: boolean;
  onSaveAsTemplate: () => void;
};

interface SubmissionsLabelProps {
  formId: string;
  submissionsCount?: number;
}

const SubmissionsLabel: React.FC<SubmissionsLabelProps> = ({
  submissionsCount = 0,
}) => {
  const submissionWord = submissionsCount === 1 ? "submission" : "submissions";
  const getFormattedSubmissionsCount = () => {
    const dividedByThousand = submissionsCount / 1000;
    if (dividedByThousand > 1) {
      return `${dividedByThousand.toFixed(1)}k`;
    }

    return submissionsCount.toString();
  };

  if (submissionsCount == 0) {
    return (
      <span className="block min-w-0 truncate text-sm text-muted-foreground">
        No submissions yet
      </span>
    );
  }

  return (
    <div className="min-w-0 truncate">
      <span className="text-2xl font-medium text-muted-foreground">
        {getFormattedSubmissionsCount()}
      </span>
      <span className="pl-2 text-sm text-muted-foreground">
        {submissionWord}
      </span>
    </div>
  );
};

const FormCard = ({
  form,
  isSelected,
  onSaveAsTemplate,
  className,
  ...props
}: FormCardProps) => {
  const getFormLabel = () => (form.isEnabled ? "Enabled" : "Disabled");
  const getVisibilityLabel = () => (form.isPublic ? "Public" : "Private");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleOpenSaveAsTemplate = () => {
    setIsDropdownOpen(false);
    onSaveAsTemplate();
  };

  return (
    <Card
      className={cn(
        "group flex h-[230px] min-w-[420px] w-full max-w-full flex-col gap-0 py-0",
        isSelected ? "bg-accent border-primary" : "",
        className,
      )}
      {...props}
    >
      <div className="flex min-h-0 min-w-0 flex-1 cursor-pointer flex-col rounded-t-md transition-colors group-hover:bg-muted/45">
        <CardHeader className="shrink-0 p-4 pt-4 pb-2">
          <CardTitle
            title={form.name}
            className="line-clamp-2 min-w-0 break-words font-sans text-2xl font-normal leading-snug tracking-tigher"
          >
            {form.name}
          </CardTitle>
        </CardHeader>
        <div className="min-h-0 flex-1 shrink" aria-hidden />
        <CardContent className="shrink-0 p-4 pt-2">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <SubmissionsLabel
                formId={form.id}
                submissionsCount={form?.submissionsCount}
              />
            </div>
            <div className="flex shrink-0 flex-nowrap items-center gap-1">
              <Badge
                className="text-xs font-normal pointer-events-none"
                variant={form.isEnabled ? "default" : "secondary"}
              >
                {getFormLabel()}
              </Badge>
              <Badge
                className="text-xs font-normal pointer-events-none flex items-center gap-1"
                variant={form.isPublic ? "default" : "outline"}
              >
                {form.isPublic ? (
                  <Globe className="h-3 w-3" />
                ) : (
                  <Lock className="h-3 w-3" />
                )}
                {getVisibilityLabel()}
              </Badge>
            </div>
          </div>
        </CardContent>
      </div>
      <CardFooter
        className="mt-auto flex h-16 min-w-0 cursor-default items-center overflow-hidden rounded-b-[6px] border-t bg-muted px-4 py-0 [.border-t]:pt-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-full w-full min-w-0 items-center justify-between gap-2">
          <div className="flex min-h-0 min-w-0 flex-1 flex-nowrap items-center gap-x-3 overflow-x-auto overflow-y-hidden opacity-0 transition-opacity group-hover:opacity-100">
            <Link
              href={{ pathname: `/forms/${form.id}/design` }}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap text-sm leading-none text-muted-foreground hover:text-foreground"
            >
              <FilePen className="size-4 shrink-0" />
              Design
            </Link>
            <Link
              href={`/share/${form.id}`}
              target="_blank"
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap text-sm leading-none text-muted-foreground hover:text-foreground"
            >
              <Link2 className="size-4 shrink-0" />
              Share Link
            </Link>
            <Link
              href={{
                pathname: form?.submissionsCount
                  ? `/forms/${form.id}/submissions`
                  : "/",
              }}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm leading-none text-muted-foreground",
                form?.submissionsCount
                  ? "cursor-pointer hover:text-foreground"
                  : "pointer-events-none cursor-default opacity-50",
              )}
            >
              <List className="size-4 shrink-0" />
              Submissions
            </Link>
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
                >
                  <MoreVertical className="size-4" />
                  <span className="sr-only">More options</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handleOpenSaveAsTemplate}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save as Template
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default FormCard;
