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
import { useEffect, useState } from "react";

export interface CustomQuestionRequest {
  /** Name of the designer element being saved. */
  elementName: string;
  defaultName: string;
  defaultTitle: string;
  onSubmit: (name: string, title: string) => void;
}

interface CustomQuestionDialogProps {
  request: CustomQuestionRequest | null;
  onClose: () => void;
}

export function CustomQuestionDialog({
  request,
  onClose,
}: Readonly<CustomQuestionDialogProps>) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [errors, setErrors] = useState<{ name?: string; title?: string }>({});

  useEffect(() => {
    if (!request) {
      return;
    }
    setName(request.defaultName);
    setTitle(request.defaultTitle);
    setErrors({});
  }, [request]);

  if (!request) {
    return null;
  }

  const handleSubmit = () => {
    const nextName = name.trim();
    const nextTitle = title.trim();
    const nextErrors = {
      name: nextName ? undefined : "Question name is required",
      title: nextTitle ? undefined : "Question title is required",
    };
    setErrors(nextErrors);

    if (nextErrors.name || nextErrors.title) {
      return;
    }

    request.onSubmit(nextName, nextTitle);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save as custom question</DialogTitle>
          <p className="text-base font-medium text-foreground">
            {request.elementName}
          </p>
          <DialogDescription>
            It joins the toolbox and can be reused in any form in this
            organization.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="custom-question-name">Name</Label>
            <Input
              id="custom-question-name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={errors.name ? true : undefined}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="custom-question-title">Title</Label>
            <Input
              id="custom-question-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              aria-invalid={errors.title ? true : undefined}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save question</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
