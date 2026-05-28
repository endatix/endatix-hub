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
import { DATA_LIST_NAME_MAX_LENGTH } from "../constants";

export interface ConvertInlineChoicesDialogProps {
  open: boolean;
  name: string;
  errorMessage?: string;
  onOpenChange: (open: boolean) => void;
  onNameChange: (name: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConvertInlineChoicesDialog({
  open,
  name,
  errorMessage,
  onOpenChange,
  onNameChange,
  onCancel,
  onConfirm,
}: Readonly<ConvertInlineChoicesDialogProps>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Convert inline choices to a data list?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-left text-sm">
              <p>
                A new data list will be created and populated with these
                choices.
              </p>
              <p>
                <strong>This question</strong> will use that data list as its
                choice source.
              </p>
              <p>Inline choices will be removed from the question.</p>
              <p>Save the form to persist this change.</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <label
            className="block text-sm font-medium"
            htmlFor="edx-convert-list-name"
          >
            Data list name
          </label>
          <Input
            id="edx-convert-list-name"
            type="text"
            value={name}
            maxLength={DATA_LIST_NAME_MAX_LENGTH}
            onChange={(e) => onNameChange(e.target.value)}
            autoFocus
          />
          {errorMessage ? (
            <p className="text-xs text-destructive">{errorMessage}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm}>
            Convert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
