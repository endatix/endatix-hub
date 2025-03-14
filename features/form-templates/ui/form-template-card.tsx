"use client";

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
import { Eye, FilePen, FilePlus2 } from "lucide-react";
import React from "react";

type FormTemplateCardProps = React.ComponentProps<typeof Card> & {
  template: FormTemplate;
  isSelected: boolean;
};

const FormTemplateCard = ({ template, isSelected, className, ...props }: FormTemplateCardProps) => {
  const getEnabledLabel = () => (template.isEnabled ? "Enabled" : "Disabled");

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
          <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <Link
              href={`forms/templates/${template.id}`}
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center cursor-pointer"
            >
              <FilePen className="w-4 h-4 mr-1" />
              Design
            </Link>
            <Link
              href={`/forms/templates/${template.id}/preview`}
              target="_blank"
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center cursor-pointer"
            >
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </Link>
            <Link
              href={`forms/templates/${template.id}/useTemplate`}
              className={cn(
                "text-sm text-muted-foreground inline-flex items-center",
                "hover:text-foreground cursor-pointer",
              )}
            >
              <FilePlus2 className="w-4 h-4 mr-1" />
              Use Template
            </Link>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default FormTemplateCard;
