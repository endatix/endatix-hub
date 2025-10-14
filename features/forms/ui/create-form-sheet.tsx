"use client";

import DotLoader from "@/components/loaders/dot-loader";
import { Spinner } from "@/components/loaders/spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { useTemplateAction } from "@/features/form-templates/application/use-template.action";
import { FormTemplatePreview } from "@/features/form-templates/ui/form-template-preview";
import { createFormAction } from "@/features/forms/application/actions/create-form.action";
import { CreateFormRequest } from "@/lib/form-types";
import { Result } from "@/lib/result";
import { cn } from "@/lib/utils";
import { FormTemplate } from "@/types";
import { BicepsFlexed, Code, Copy, Folder, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { FC, useState, useTransition, useEffect } from "react";
import ChatBox from "./chat-box";
import TemplateSelector from "./template-selector";

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

interface CreateFormSheetContainerProps {
  aiFeatureFlag: boolean;
}

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
        "hover:border-primary hover:bg-accent focus:outline focus:outline-2 focus:outline-primary-500 flex flex-col overflow-hidden",
        !disabled && "cursor-pointer",
        isSelected && "border-primary bg-accent",
        disabled &&
          "opacity-50 cursor-not-allowed hover:border-border hover:bg-background",
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 p-4 flex-grow">
        <CardTitle className="text-lg font-medium leading-tight">
          {title}
        </CardTitle>
        <Icon className="h-8 w-8 text-muted-foreground shrink-0 ml-4" />
      </CardHeader>
      <CardContent className="p-4 bg-muted mt-auto border-t rounded-b-lg">
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
};

const CreateFormSheet: FC<CreateFormSheetContainerProps> = ({
  aiFeatureFlag,
}) => {
  const [pending, setPending] = useState(false);
  const [selectedOption, setSelectedOption] = useState<CreateFormOption>();
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(
    null,
  );
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(
    null,
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [aiFormId, setAiFormId] = useState<string | null>(null);
  const [isCreatingAiForm, setIsCreatingAiForm] = useState(false);
  const router = useRouter();

  const openNewFormInEditor = async () => {
    if (isPending) {
      return;
    }

    startTransition(async () => {
      const request: CreateFormRequest = {
        name: "New Form",
        isEnabled: true,
        formDefinitionJsonData: JSON.stringify("{ }"),
      };
      const formResult = await createFormAction(request);
      if (Result.isSuccess(formResult) && formResult.value) {
        const formId = formResult.value;
        router.push(`/forms/${formId}/design`);
      } else {
        alert("Failed to create form");
      }
    });
  };

  const handleTemplateSelect = (template: FormTemplate) => {
    setSelectedTemplate(template);
  };

  const handlePreviewTemplate = (templateId: string) => {
    setPreviewTemplateId(templateId);
    setIsPreviewOpen(true);
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate || isPending) return;

    startTransition(async () => {
      try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const result = await useTemplateAction({
          templateId: selectedTemplate.id,
        });

        if (Result.isSuccess(result)) {
          toast.success("Form created from template successfully");
          router.push(`/forms/${result.value}/design`);
        } else {
          toast.error(result.message || "Failed to create form from template");
        }
      } catch (error) {
        console.error("Error creating form from template:", error);
        toast.error((error as string) || "Failed to create form from template");
      }
    });
  };

  // Create empty form for AI assistant when feature flag is enabled
  useEffect(() => {
    if (aiFeatureFlag && !aiFormId && !isCreatingAiForm) {
      setIsCreatingAiForm(true);
      startTransition(async () => {
        try {
          const request: CreateFormRequest = {
            name: "AI Generated Form",
            isEnabled: false,
            formDefinitionJsonData: JSON.stringify({}),
          };
          const result = await createFormAction(request);
          if (Result.isSuccess(result) && result.value) {
            setAiFormId(result.value);
          } else {
            const errorMessage = Result.isError(result) ? result.message : "Unknown error";
            console.error("Failed to create AI form:", errorMessage);
            toast.error("Failed to initialize AI assistant");
          }
        } catch (error) {
          console.error("Error creating AI form:", error);
          toast.error("Failed to initialize AI assistant");
        } finally {
          setIsCreatingAiForm(false);
        }
      });
    }
  }, [aiFeatureFlag, aiFormId, isCreatingAiForm]);

  const handleAiFormGenerated = () => {
    if (aiFormId) {
      router.push(`/forms/${aiFormId}/design`);
    }
  };

  return (
    <SheetContent className="w-[600px] sm:w-[480px] sm:max-w-none flex flex-col h-screen justify-between">
      <SheetHeader className="mb-12">
        <SheetTitle>Create a Form</SheetTitle>
        <SheetDescription>
          Choose one of the following options to create a form.
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-wrap items-start justify-center flex-grow">
        <div className="grid grid-cols-2 gap-6">
          <CreateFormCard
            title="Start from Scratch"
            description="Use the WYSIWYG Survey Creator to build your form."
            icon={BicepsFlexed}
            action="from_scratch"
            isSelected={selectedOption === "from_scratch"}
            onClick={openNewFormInEditor}
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
      {(pending || isCreatingAiForm) && <DotLoader className="flex-1 text-center m-auto" />}
      <SheetFooter className="flex-end">
        <div className="w-full space-y-4">
          {selectedOption === "from_template" && (
            <div className="w-full space-y-4">
              <TemplateSelector
                onTemplateSelect={handleTemplateSelect}
                onPreviewTemplate={handlePreviewTemplate}
              />
              {selectedTemplate && (
                <Button
                  className="w-full"
                  onClick={handleCreateFromTemplate}
                  disabled={isPending}
                >
                  {isPending ? (
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

          {aiFeatureFlag && aiFormId && (
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
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Let <span className="font-bold">Endatix AI Assistant</span> build the form
              </p>
              <ChatBox
                formId={aiFormId}
                requiresNewContext={true}
                onPendingChange={(pending) => {
                  setPending(pending);
                }}
                onFormGenerated={handleAiFormGenerated}
              />
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
  );
};

export default CreateFormSheet;
