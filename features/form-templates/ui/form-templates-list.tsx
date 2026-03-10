"use client";

import { FormTemplate } from "@/types";
import { use, useMemo, useState } from "react";
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

type FormTemplatesListProps = {
  templatesPromise: Promise<FormTemplate[]>;
};

const FormTemplatesList = ({ templatesPromise }: FormTemplatesListProps) => {
  const templates = use(templatesPromise);
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

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId),
    [selectedTemplateId, templates],
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
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-4">
        {templates.map((template) => (
          <FormTemplateCard
            key={template.id}
            template={template}
            isSelected={template.id === selectedTemplateId}
            onClick={() => handleTemplateSelected(template.id)}
            onPreviewClick={handlePreviewOpen}
          />
        ))}
      </div>

      <FormTemplateSheet
        modal={false}
        selectedTemplate={selectedTemplate ?? null}
        open={isSheetOpen}
        onOpenChange={handleSheetOpenChange}
        onPreviewClick={selectedTemplate ? handlePreviewOpen : undefined}
      />

      {previewTemplateId && (
        <FormTemplatePreview
          open={isPreviewOpen}
          onOpenChange={handlePreviewOpenChange}
          templateId={previewTemplateId}
        />
      )}
    </>
  );
};

const NoFormTemplates = () => {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileText />
        </EmptyMedia>
        <EmptyTitle>No form templates yet</EmptyTitle>
        <EmptyDescription>
          You haven&apos;t created any form templates yet. Get started by
          creating your first template.
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
