"use client";

import { FormTemplate } from "@/types";
import { use, useState } from "react";
import FormTemplateCard from "./form-template-card";
import FormTemplateSheet from "./form-template-sheet";
import { FormTemplatePreview } from "./form-template-preview";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, FilePlus2, FileText } from "lucide-react";
import Link from "next/link";
import { HubPageLoadError } from "@/components/error-handling/error-page";
import { Result, type ResultType } from "@/lib/result";

type FormTemplatesListProps = {
  templatesPromise: Promise<ResultType<FormTemplate[]>>;
  requireFolderAssignment?: boolean;
  /** Whether the user holds forms.create; without it, Use Template is hidden. */
  canCreateForms: boolean;
};

const FormTemplatesList = ({
  templatesPromise,
  requireFolderAssignment = false,
  canCreateForms,
}: FormTemplatesListProps) => {
  const templatesResult = use(templatesPromise);

  if (Result.isError(templatesResult)) {
    return <HubPageLoadError result={templatesResult} />;
  }

  return (
    <FormTemplatesListContent
      templates={templatesResult.value}
      requireFolderAssignment={requireFolderAssignment}
      canCreateForms={canCreateForms}
    />
  );
};

type FormTemplatesListContentProps = {
  templates: FormTemplate[];
  requireFolderAssignment: boolean;
  canCreateForms: boolean;
};

function FormTemplatesListContent({
  templates,
  requireFolderAssignment,
  canCreateForms,
}: Readonly<FormTemplatesListContentProps>) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(
    null,
  );

  const handleTemplateSelected = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setIsSheetOpen(true);
  };

  const handlePreviewOpen = (templateId: string) => {
    setIsSheetOpen(false);

    setPreviewTemplateId(templateId);
    setIsPreviewOpen(true);
  };

  const selectedTemplate = templates.find(
    (template) => template.id === selectedTemplateId,
  );

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setSelectedTemplateId(null);
    }
  };

  const handlePreviewOpenChange = (open: boolean) => {
    setIsPreviewOpen(open);
    if (!open) {
      setPreviewTemplateId(null);
    }
  };

  if (templates.length === 0) {
    return <NoFormTemplates />;
  }

  return (
    <>
      <div className="grid-card-list">
        {templates.map((template) => (
          <FormTemplateCard
            key={template.id}
            template={template}
            isSelected={template.id === selectedTemplateId}
            requireFolderAssignment={requireFolderAssignment}
            canCreateForms={canCreateForms}
            onOpen={() => handleTemplateSelected(template.id)}
            onPreviewClick={handlePreviewOpen}
          />
        ))}
      </div>

      <FormTemplateSheet
        selectedTemplate={selectedTemplate ?? null}
        open={isSheetOpen}
        onOpenChange={handleSheetOpenChange}
        requireFolderAssignment={requireFolderAssignment}
        canCreateForms={canCreateForms}
        onPreviewClick={selectedTemplate ? handlePreviewOpen : undefined}
      />

      {previewTemplateId && (
        <FormTemplatePreview
          open={isPreviewOpen}
          onOpenChange={handlePreviewOpenChange}
          templateId={previewTemplateId}
          requireFolderAssignment={requireFolderAssignment}
          canCreateForms={canCreateForms}
        />
      )}
    </>
  );
}

const NoFormTemplates = () => {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileText />
        </EmptyMedia>
        <EmptyTitle>No unassigned form templates yet</EmptyTitle>
        <EmptyDescription>
          Templates without a folder appear here. Create your first template or
          move an existing one out of a folder.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex flex-row justify-center gap-2">
        <Button asChild>
          <Link href="/forms/templates/create">
            <FilePlus2 data-icon="inline-start" />
            Create a Form Template
          </Link>
        </Button>
      </EmptyContent>
      <Button
        variant="link"
        asChild
        className="text-muted-foreground"
        size="sm"
      >
        <a
          href="https://docs.endatix.com/docs/form-builder?utm_source=endatix-hub&utm_medium=product"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn more <ArrowUpRight data-icon="inline-end" />
        </a>
      </Button>
    </Empty>
  );
};

export default FormTemplatesList;
