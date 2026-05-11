"use client";

import DotLoader from "@/components/loaders/dot-loader";
import { Spinner } from "@/components/loaders/spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssistantFolderSelect } from "@/features/forms/use-cases/design-form/ui/assistant-folder-select";
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
import { listFoldersAction } from "@/features/folders/server";
import { getTenantSettingsAction } from "@/features/forms/application/actions/get-tenant-settings.action";
import { cn } from "@/lib/utils";
import { FormTemplate } from "@/types";
import {
  BicepsFlexed,
  Code,
  Copy,
  FilePlus2,
  Folder,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FC, useEffect, useState, useTransition } from "react";
import TemplateSelector from "./template-selector";
import { useFormAssistant } from "../use-cases/design-form/form-assistant.context";
import { useAutoCreateForm } from "../use-cases/design-form/use-auto-create-form.hook";
import ChatBox from "./chat/chat-box";
import { Result } from "@/lib/result";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type CreateFormOption =
  | "from_scratch"
  | "from_existing"
  | "from_template"
  | "from_json"
  | "via_assistant";

interface FormCreateSheetProps {
  title: string;
  description: string;
  icon: React.ElementType;
  action?: CreateFormOption;
  isSelected?: boolean;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
}

const NO_FOLDER_ID = "__none__";

const CreateFormCard: FC<FormCreateSheetProps> = ({
  title,
  description,
  icon: Icon,
  onClick,
  isSelected,
  disabled,
}) => {
  return (
    <Card
      onClick={disabled ? undefined : onClick}
      className={cn(
        "focus:outline-primary-500 flex flex-col overflow-hidden py-0 hover:border-primary hover:bg-accent focus:outline focus:outline-2",
        !disabled && "cursor-pointer",
        isSelected && "border-primary bg-accent",
        disabled &&
          "cursor-not-allowed opacity-50 hover:border-border hover:bg-background",
      )}
    >
      <CardHeader className="flex flex-grow flex-row items-start justify-between space-y-0 p-4 pb-2">
        <CardTitle className="text-lg leading-tight font-medium">
          {title}
        </CardTitle>
        <Icon className="ml-4 h-8 w-8 shrink-0 text-muted-foreground" />
      </CardHeader>
      <CardContent className="mt-auto rounded-b-lg border-t bg-muted p-4">
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
};

const CreateFormSheet: FC = () => {
  const [selectedOption, setSelectedOption] = useState<CreateFormOption>();
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(
    null,
  );
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(
    null,
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [requireFolderAssignment, setRequireFolderAssignment] = useState(false);
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(NO_FOLDER_ID);
  const router = useRouter();
  const { isAssistantEnabled, chatContext } = useFormAssistant();
  const { isCreatingForm } = useAutoCreateForm({
    onFormCreated: (formId) => {
      toast.success("Form created successfully");
      router.push(`/forms/${formId}/design`);
    },
  });

  const isGeneratingResponse =
    (chatContext?.isResponsePending ?? false) || isCreatingForm;
  const isFolderRequiredAndMissing =
    requireFolderAssignment && selectedFolderId === NO_FOLDER_ID;

  useEffect(() => {
    void (async () => {
      const [tenantSettingsResult, foldersResult] = await Promise.all([
        getTenantSettingsAction(),
        listFoldersAction(),
      ]);

      if (Result.isSuccess(tenantSettingsResult)) {
        setRequireFolderAssignment(
          tenantSettingsResult.value.requireFolderAssignment === true,
        );
      }

      if (Result.isSuccess(foldersResult)) {
        setFolders(
          foldersResult.value
            .filter((folder) => folder.isActive)
            .map((folder) => ({ id: folder.id, name: folder.name })),
        );
      }
    })();
  }, []);

  const handleTemplateSelect = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setSelectedFolderId(template.folderId ?? NO_FOLDER_ID);
  };

  const handlePreviewTemplate = (templateId: string) => {
    setPreviewTemplateId(templateId);
    setIsPreviewOpen(true);
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate || isPending) return;

    startTransition(async () => {
      await runCreateFormFromTemplate(
        selectedTemplate.id,
        router,
        selectedFolderId === NO_FOLDER_ID ? undefined : selectedFolderId,
      );
    });
  };

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
          <SheetDescription>
            Choose one of the following options to create a form.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-grow flex-wrap items-start justify-center">
          <div className="grid grid-cols-2 gap-6">
            <CreateFormCard
              title="Start from Scratch"
              description="Use the WYSIWYG Survey Creator to build your form."
              icon={BicepsFlexed}
              action="from_scratch"
              isSelected={selectedOption === "from_scratch"}
              onClick={() => router.push("/forms/create")}
              disabled={isPending}
            />
            <CreateFormCard
              title="Copy an Existing Form"
              description="You have your JSON code ready? Paste it here."
              icon={Copy}
              action="from_existing"
              isSelected={selectedOption === "from_existing"}
              onClick={() => setSelectedOption("from_existing")}
              disabled
            />
            <CreateFormCard
              title="Create from a Template"
              description="Choose from a variety of templates to get started."
              icon={Folder}
              action="from_template"
              isSelected={selectedOption === "from_template"}
              onClick={() => setSelectedOption("from_template")}
            />
            <CreateFormCard
              title="Import a Form"
              description="You have your JSON code ready? Paste it here."
              icon={Code}
              action="from_json"
              isSelected={selectedOption === "from_json"}
              onClick={() => setSelectedOption("from_json")}
              disabled
            />
          </div>
        </div>
        {isGeneratingResponse && (
          <DotLoader className="m-auto flex-1 text-center" />
        )}
        <SheetFooter className="flex-end">
          <div className="w-full space-y-4">
            {selectedOption === "from_template" && (
              <div className="w-full space-y-4">
                <TemplateSelector
                  onTemplateSelect={handleTemplateSelect}
                  onPreviewTemplate={handlePreviewTemplate}
                />
                {(folders.length > 0 || requireFolderAssignment) && (
                  <div className="space-y-2">
                    <Label htmlFor="create-form-sheet-folder-id">
                      Folder
                      {requireFolderAssignment ? (
                        <span className="text-destructive"> *</span>
                      ) : (
                        " (optional)"
                      )}
                    </Label>
                    <Select
                      value={selectedFolderId}
                      onValueChange={setSelectedFolderId}
                      disabled={isPending || isCreatingForm}
                    >
                      <SelectTrigger id="create-form-sheet-folder-id" className="w-full">
                        <SelectValue
                          placeholder={
                            requireFolderAssignment ? "Select a folder" : "No folder"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value={NO_FOLDER_ID}>
                            {requireFolderAssignment ? "Select a folder" : "No folder"}
                          </SelectItem>
                          {folders.map((folder) => (
                            <SelectItem key={folder.id} value={folder.id}>
                              {folder.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {requireFolderAssignment && (
                      <p className="text-sm text-muted-foreground">
                        A folder is required by your organization policy.
                      </p>
                    )}
                    {requireFolderAssignment && folders.length === 0 && (
                      <p className="text-sm text-destructive">
                        No active folders exist. Create a folder under Forms → Folders
                        before creating a form.
                      </p>
                    )}
                  </div>
                )}
                {selectedTemplate && (
                  <Button
                    className="w-full"
                    onClick={handleCreateFromTemplate}
                    disabled={
                      isPending ||
                      isCreatingForm ||
                      isFolderRequiredAndMissing ||
                      (requireFolderAssignment && folders.length === 0)
                    }
                  >
                    {isPending || isCreatingForm ? (
                      <>
                        <Spinner className="mr-2 h-4 w-4" />
                        Creating...
                      </>
                    ) : (
                      "Create Form from Template"
                    )}
                  </Button>
                )}
              </div>
            )}

            {isAssistantEnabled && (
              <div className="w-full space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      or
                    </span>
                  </div>
                </div>
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Sparkles className="h-4 w-4" />
                  Let <span className="font-bold">
                    Endatix AI Assistant
                  </span>{" "}
                  build the form
                </p>
                <AssistantFolderSelect />
                <ChatBox />
              </div>
            )}
          </div>
        </SheetFooter>

        {previewTemplateId && (
          <FormTemplatePreview
            open={isPreviewOpen}
            onOpenChange={setIsPreviewOpen}
            templateId={previewTemplateId}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CreateFormSheet;
