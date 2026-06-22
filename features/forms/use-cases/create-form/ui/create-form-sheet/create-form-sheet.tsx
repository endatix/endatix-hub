"use client";

import DotLoader from "@/components/loaders/dot-loader";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { runCreateFormFromTemplate } from "@/features/form-templates/application/run-create-form-from-template.client";
import { FormTemplatePreview } from "@/features/form-templates/ui/form-template-preview";
import { useCreateFormFolderContext } from "../../use-create-form-folder-context";
import { useCreateFormSheetBootstrap } from "../../use-create-form-sheet-bootstrap";
import type { Folder } from "@/lib/endatix-api/folders/types";
import type { FormTemplate } from "@/types";
import { FilePlus2 } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useFormAssistant } from "../../../design-form/form-assistant.context";
import { useAutoCreateForm } from "../../../design-form/use-auto-create-form.hook";
import { CreateFormAssistantPanel } from "./create-form-assistant-panel";
import { CreateFormFromScratchPanel } from "./create-form-from-scratch-panel";
import { CreateFormOptionsGrid } from "./create-form-options-grid";
import { CreateFormTemplatePanel } from "./create-form-template-panel";
import type { CreateFormOption } from "./types";
import { NO_FOLDER_ID } from "./types";

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

  const {
    effectiveFolderId,
    effectiveFolderName,
    effectiveFolderSlug,
    foldersWithFetched,
  } = useCreateFormFolderContext({
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

  const cancelHref: Route = effectiveFolderSlug
    ? (`/forms/folders/${encodeURIComponent(effectiveFolderSlug)}` as Route)
    : "/forms";

  useEffect(() => {
    if (effectiveFolderId) {
      setSelectedFolderId(String(effectiveFolderId));
    }
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

  const sheetDescription = effectiveFolderName
    ? `Create a form in "${effectiveFolderName}". Choose an option below.`
    : "Choose one of the following options to create a form.";

  return (
    <Sheet modal>
      <SheetTrigger asChild>
        <Button variant="default">
          <FilePlus2 className="h-4 w-4" />
          Create a Form
        </Button>
      </SheetTrigger>
      <SheetContent className="flex h-screen w-[600px] flex-col justify-between p-6 sm:w-[480px] sm:max-w-none">
        <SheetHeader className="mb-12">
          <SheetTitle>Create a Form</SheetTitle>
          <SheetDescription>{sheetDescription}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-grow flex-wrap items-start justify-center">
          {isFromScratch ? (
            <CreateFormFromScratchPanel
              canRenderWizard={canRenderWizard}
              requireFolderAssignment={requireFolderAssignment}
              folders={foldersWithFetched}
              effectiveFolderId={effectiveFolderId}
              effectiveFolderName={effectiveFolderName}
              cancelHref={cancelHref}
              onBack={() => setSelectedOption(undefined)}
            />
          ) : (
            <CreateFormOptionsGrid
              selectedOption={selectedOption}
              onSelectOption={setSelectedOption}
              isPending={isPending}
            />
          )}
        </div>

        {isGeneratingResponse ? (
          <DotLoader className="m-auto flex-1 text-center" />
        ) : null}

        {!isFromScratch ? (
          <SheetFooter className="flex-end">
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
          </SheetFooter>
        ) : null}

        {previewTemplateId ? (
          <FormTemplatePreview
            open={isPreviewOpen}
            onOpenChange={setIsPreviewOpen}
            templateId={previewTemplateId}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
