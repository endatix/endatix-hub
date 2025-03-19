"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/loaders/spinner";
import { FormEvent, useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";
import { saveAsTemplateAction } from "@/features/form-templates/application/save-as-template.action";
import { Result } from "@/lib/result";

interface SaveAsTemplateDialogProps {
  formId: string;
  formName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (templateId: string) => void;
}

export function SaveAsTemplateDialog({
  formId,
  formName,
  open,
  onOpenChange,
  onSuccess,
}: SaveAsTemplateDialogProps) {
  const [name, setName] = useState(`${formName} - Template`);
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }

    startTransition(async () => {
      try {
        const result = await saveAsTemplateAction({
          formId,
          name: name.trim(),
          description: description.trim(),
        });

        if (Result.isSuccess(result) && result.value) {
          const templateId = result.value;
          toast.success({
            title: "Form saved as template successfully",
            description: "Click Edit to open the template in a new tab.",
            action: {
              label: "Edit",
              onClick: () => {
                window.open(`/forms/templates/${templateId}`, "_blank");
              },
            },
          });
          onOpenChange(false);
          if (onSuccess) {
            onSuccess(templateId);
          }
        } else {
          toast.error(
            Result.isError(result) && result.message
              ? result.message
              : "Failed to save form as template. Please try again.",
          );
        }
      } catch (error) {
        console.error("Error saving form as template:", error);
        toast.error("An unexpected error occurred");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save Form as Template</DialogTitle>
          <DialogDescription>
            Create a reusable template from this form. Templates can be used to
            create new forms quickly.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                required
                disabled={isPending}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
                placeholder="Optional description"
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Saving...
                </>
              ) : (
                "Save as Template"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
