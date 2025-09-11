"use client";

import { Spinner } from "@/components/loaders/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { FormTemplate } from "@/types";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getTemplateAction } from "../application/get-template.action";
import { UseTemplateButton } from "./use-template-button";
import { getCustomQuestionsAction } from "@/features/forms/application/actions/get-custom-questions.action";
import { Result } from "@/lib/result";
import { initializeCustomQuestions } from "@/lib/questions/infrastructure/specialized-survey-question";
import { customQuestions } from '@/customizations/questions/question-registry';
import { questionLoaderModule } from '@/lib/questions/question-loader-module';

const SurveyPreviewComponent = dynamic(
  () => import("./survey-preview-component"),
  {
    ssr: false,
    loading: () => <Spinner className="w-8 h-8 mx-auto my-12" />,
  },
);

// Load all custom questions registered in the question registry
for (const questionName of customQuestions) {
  try {
    await questionLoaderModule.loadQuestion(questionName);
    console.debug(`✅ Loaded custom question: ${questionName}`);
  } catch (error) {
    console.warn(`⚠️ Failed to load custom question: ${questionName}`, error);
  }
}

interface FormTemplatePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
}

export function FormTemplatePreview({
  open,
  onOpenChange,
  templateId,
}: FormTemplatePreviewProps) {
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    if (open && templateId) {
      const fetchTemplate = async () => {
        try {
          setLoading(true);
          setError(null);

          const questionsResult = await getCustomQuestionsAction();
          if (Result.isSuccess(questionsResult)) {
            initializeCustomQuestions(questionsResult.value.map(q => q.jsonData));
          }

          const data = await getTemplateAction(templateId);
          setTemplate(data);
        } catch (err) {
          setError("Failed to load form template");
          console.error(err);
        } finally {
          setLoading(false);
        }
      };

      fetchTemplate();
    }
  }, [open, templateId]);

  const PreviewContent = (
    <div className="mt-0 px-1">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner className="w-8 h-8" />
        </div>
      ) : error ? (
        <div className="text-destructive text-center">{error}</div>
      ) : template ? (
        <SurveyPreviewComponent template={template} />
      ) : null}
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[875px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {loading ? "Loading..." : template?.name}
            </DialogTitle>
            <DialogDescription>
              {loading
                ? "Please wait..."
                : `Showing template ${template?.name} in read-only mode`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <UseTemplateButton template={template} />
          </DialogFooter>
          {PreviewContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className={cn("max-h-[85vh]")}>
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-2xl font-bold">
            {loading ? "Loading..." : template?.name}
          </DrawerTitle>
          <DrawerDescription>
            {loading
              ? "Please wait..."
              : `Showing template ${template?.name} in read-only mode`}
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto">{PreviewContent}</div>
        <DrawerFooter>
          <UseTemplateButton template={template} />
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
