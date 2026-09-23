"use client";

import DotLoader from "@/components/loaders/dot-loader";
import { Button } from "@/components/ui/button";
import {
  ResponsivePanel,
  ResponsivePanelBody,
  ResponsivePanelDescription,
  ResponsivePanelFooter,
  ResponsivePanelHeader,
  ResponsivePanelTitle,
} from "@/components/ui/responsive-panel";
import { toast } from "@/components/ui/toast";
import { runCreateFormFromTemplate } from "@/features/form-templates/application/run-create-form-from-template.client";
import { FormTemplatePreview } from "@/features/form-templates/ui/form-template-preview";
import { useCreateFormFolderContext } from "../../use-create-form-folder-context";
import { useCreateFormSheetBootstrap } from "../../use-create-form-sheet-bootstrap";
import type { Folder } from "@/lib/endatix-api/folders/types";
import type { FormTemplate } from "@/types";
import { ArrowLeft, FilePlus2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useFormAssistant } from "../../../design-form/form-assistant.context";
import { useAutoCreateForm } from "../../../design-form/use-auto-create-form.hook";
import { CreateFormAssistantPanel } from "./create-form-assistant-panel";
import { CreateFormFromScratchPanel } from "./create-form-from-scratch-panel";
import { CREATE_FORM_WIZARD_ACTIONS_ELEMENT_ID } from "../../create-form-wizard";
import { CreateFormOptionsGrid } from "./create-form-options-grid";
import { CreateFormTemplatePanel } from "./create-form-template-panel";
import type { CreateFormOption } from "./types";
import { NO_FOLDER_ID } from "./types";
import { registerOpenCreateFormSheet } from "../open-create-form-button";

interface CreateFormSheetProps {
  defaultFolderId?: string;
  defaultFolderSlug?: string;
  defaultFolderName?: string;
  initialFolders?: Folder[];
  initialRequireFolderAssignment?: boolean;
}

export function CreateFormSheet({
  defaultFolderId,
  defaultFolderSlug,
  defaultFolderName,
  initialFolders = [],
  initialRequireFolderAssignment = false,
}: Readonly<CreateFormSheetProps>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<
    CreateFormOption | undefined
  >(undefined);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(
    null,
  );
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(
    null,
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { folders, foldersReady, requireFolderAssignment } =
    useCreateFormSheetBootstrap({
      initialFolders,
      initialRequireFolderAssignment,
    });

  const { effectiveFolderId, effectiveFolderName, foldersWithFetched } =
    useCreateFormFolderContext({
      folders,
      defaultFolderId,
      defaultFolderSlug,
      defaultFolderName,
    });

  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    () => effectiveFolderId ?? NO_FOLDER_ID,
  );

  const { isAssistantEnabled, chatContext } = useFormAssistant();
  const { isCreatingForm } = useAutoCreateForm({
    onFormCreated: (formId) => {
      toast.success("Form created successfully");
      router.push(`/forms/${formId}/design`);
    },
  });

  const isFromScratch = selectedOption === "from_scratch";
  const isFromTemplate = selectedOption === "from_template";
  const isGeneratingResponse =
    (chatContext?.isResponsePending ?? false) || isCreatingForm;
  const canRenderWizard = foldersReady || Boolean(effectiveFolderId);

  const resetSheetState = useCallback(() => {
    setSelectedOption(undefined);
    setSelectedTemplate(null);
    setPreviewTemplateId(null);
    setIsPreviewOpen(false);
    setSelectedFolderId(
      effectiveFolderId ? String(effectiveFolderId) : NO_FOLDER_ID,
    );
  }, [effectiveFolderId]);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      resetSheetState();
      setOpen(isOpen);
    },
    [resetSheetState],
  );

  const handleCancel = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  useEffect(() => {
    return registerOpenCreateFormSheet(() => setOpen(true));
  }, []);

  useEffect(() => {
    setSelectedFolderId(
      effectiveFolderId ? String(effectiveFolderId) : NO_FOLDER_ID,
    );
  }, [effectiveFolderId]);

  const handleTemplateSelect = useCallback(
    (template: FormTemplate) => {
      setSelectedTemplate(template);
      setSelectedFolderId(
        template.folderId ?? effectiveFolderId ?? NO_FOLDER_ID,
      );
    },
    [effectiveFolderId],
  );

  const handlePreviewTemplate = useCallback((templateId: string) => {
    setPreviewTemplateId(templateId);
    setIsPreviewOpen(true);
  }, []);

  const handleCreateFromTemplate = useCallback(() => {
    if (!selectedTemplate || isPending) {
      return;
    }

    startTransition(async () => {
      await runCreateFormFromTemplate(
        selectedTemplate.id,
        router,
        selectedFolderId === NO_FOLDER_ID ? undefined : selectedFolderId,
      );
    });
  }, [isPending, router, selectedFolderId, selectedTemplate]);

  const sheetDescription = isFromScratch
    ? "Name the form. Add a description if you want one."
    : effectiveFolderName
      ? `Create a form in "${effectiveFolderName}". Choose an option below.`
      : "Choose one of the following options to create a form.";

  return (
    <ResponsivePanel
      desktopType="complex"
      open={open}
      onOpenChange={handleOpenChange}
      sheetContentClassName="sm:max-w-[480px]"
      trigger={
        <Button variant="default">
          <FilePlus2 className="h-4 w-4" />
          Create a Form
        </Button>
      }
    >
      <ResponsivePanelHeader>
        {isFromScratch ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit self-start px-2"
            onClick={() => setSelectedOption(undefined)}
          >
            <ArrowLeft data-icon="inline-start" />
            Back to options
          </Button>
        ) : null}
        <ResponsivePanelTitle>Create a Form</ResponsivePanelTitle>
        <ResponsivePanelDescription>
          {sheetDescription}
        </ResponsivePanelDescription>
      </ResponsivePanelHeader>

      <ResponsivePanelBody>
        {isFromScratch ? (
          <CreateFormFromScratchPanel
            canRenderWizard={canRenderWizard}
            requireFolderAssignment={requireFolderAssignment}
            folders={foldersWithFetched}
            effectiveFolderId={effectiveFolderId}
            effectiveFolderName={effectiveFolderName}
            onCancel={handleCancel}
          />
        ) : (
          <CreateFormOptionsGrid
            selectedOption={selectedOption}
            onSelectOption={setSelectedOption}
            isPending={isPending}
          />
        )}
        {isGeneratingResponse ? (
          <DotLoader className="m-auto flex-1 text-center" />
        ) : null}
      </ResponsivePanelBody>

      {isFromScratch ? (
        <ResponsivePanelFooter>
          <div
            id={CREATE_FORM_WIZARD_ACTIONS_ELEMENT_ID}
            className="flex w-full justify-end"
          />
        </ResponsivePanelFooter>
      ) : null}

      {!isFromScratch && (isFromTemplate || isAssistantEnabled) ? (
        <ResponsivePanelFooter className="sm:justify-stretch">
          <div className="flex w-full flex-col gap-4">
            {isFromTemplate ? (
              <CreateFormTemplatePanel
                folders={foldersWithFetched}
                requireFolderAssignment={requireFolderAssignment}
                selectedFolderId={selectedFolderId}
                selectedTemplate={selectedTemplate}
                isPending={isPending}
                isCreatingForm={isCreatingForm}
                onTemplateSelect={handleTemplateSelect}
                onPreviewTemplate={handlePreviewTemplate}
                onSelectedFolderIdChange={setSelectedFolderId}
                onCreateFromTemplate={handleCreateFromTemplate}
              />
            ) : null}
            {isAssistantEnabled ? <CreateFormAssistantPanel /> : null}
          </div>
        </ResponsivePanelFooter>
      ) : null}

      {previewTemplateId ? (
        <FormTemplatePreview
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          templateId={previewTemplateId}
        />
      ) : null}
    </ResponsivePanel>
  );
}
