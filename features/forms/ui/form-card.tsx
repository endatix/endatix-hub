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
import { FilePen, Link2, List, MoreVertical, Save } from "lucide-react";
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
      <span className="text-sm text-muted-foreground">No submissions yet</span>
    );
  }

  return (
    <div>
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleOpenSaveAsTemplate = () => {
    setIsDropdownOpen(false);
    onSaveAsTemplate();
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
      <div className="flex flex-col justify-between h-full cursor-pointer">
        <CardHeader className="flex flex-row justify-between p-4 pt-6">
          <CardTitle className="text-2xl font-normal font-sans tracking-tigher">
            {form.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-4">
          <div className="flex justify-between items-center">
            <SubmissionsLabel
              formId={form.id}
              submissionsCount={form?.submissionsCount}
            />
            <Badge
              className="text-xs font-normal pointer-events-none"
              variant={form.isEnabled ? "default" : "secondary"}
            >
              {getFormLabel()}
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
              href={{ pathname: `/forms/${form.id}/design` }}
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center cursor-pointer"
            >
              <FilePen className="w-4 h-4 mr-1" />
              Design
            </Link>
            <Link
              href={`/share/${form.id}`}
              target="_blank"
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center cursor-pointer"
            >
              <Link2 className="w-4 h-4 mr-1" />
              Share
            </Link>
            <Link
              href={{
                pathname: form?.submissionsCount
                  ? `/forms/${form.id}/submissions`
                  : "/",
              }}
              className={cn(
                "text-sm text-muted-foreground inline-flex items-center",
                form?.submissionsCount
                  ? "hover:text-foreground cursor-pointer"
                  : "opacity-50 pointer-events-none cursor-default",
              )}
            >
              <List className="w-4 h-4 mr-1" />
              Submissions
            </Link>
          </div>
          <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu
              open={isDropdownOpen}
              onOpenChange={setIsDropdownOpen}
            >
              <DropdownMenuTrigger asChild>
                <button className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center cursor-pointer">
                  <MoreVertical className="w-4 h-4" />
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
