"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

export type ThemeSaveDecision =
  | { action: "overwrite" }
  | { action: "save-as-new"; name: string }
  | { action: "skip" };

export interface ThemeSaveRequest {
  themeName: string;
  /** The Default theme is reserved, so its edits can only be kept as a new theme. */
  isDefaultTheme: boolean;
  resolve: (decision: ThemeSaveDecision) => void;
}

interface ThemeSaveDialogProps {
  request: ThemeSaveRequest | null;
}

const RESERVED_NAME = "default";

export function ThemeSaveDialog({ request }: Readonly<ThemeSaveDialogProps>) {
  const [saveAsNew, setSaveAsNew] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isDefaultTheme = request?.isDefaultTheme ?? false;

  useEffect(() => {
    if (!request) {
      return;
    }
    setSaveAsNew(request.isDefaultTheme);
    setName("");
    setError(null);
  }, [request]);

  if (!request) {
    return null;
  }

  const decide = (decision: ThemeSaveDecision) => request.resolve(decision);

  const handleSave = () => {
    if (!saveAsNew) {
      decide({ action: "overwrite" });
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Theme name is required");
      return;
    }
    if (trimmed.toLowerCase() === RESERVED_NAME) {
      setError("“Default” is reserved. Choose another name.");
      return;
    }

    decide({ action: "save-as-new", name: trimmed });
  };

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        // The user must pick an explicit action: this dialog is the only place the
        // theme edits can be kept, and dismissing it silently discarded them.
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>Save theme changes?</DialogTitle>
          <p className="text-base font-medium text-foreground">
            {isDefaultTheme ? "Default" : request.themeName}
          </p>
          <DialogDescription>
            {isDefaultTheme
              ? "The Default theme is shared by every form and cannot be overwritten. Keep your changes as a new theme."
              : "Saving updates this theme everywhere it is used."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {!isDefaultTheme && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="theme-save-as-new"
                checked={saveAsNew}
                onCheckedChange={(checked) => {
                  setSaveAsNew(checked === true);
                  setError(null);
                }}
              />
              <Label htmlFor="theme-save-as-new" className="font-normal">
                Save as a new theme instead
              </Label>
            </div>
          )}

          {saveAsNew && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="theme-name">Theme name</Label>
              <Input
                id="theme-name"
                autoFocus
                value={name}
                placeholder={`${request.themeName} copy`}
                onChange={(event) => {
                  setName(event.target.value);
                  setError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSave();
                  }
                }}
                aria-invalid={error ? true : undefined}
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => decide({ action: "skip" })}>
            Discard changes
          </Button>
          <Button onClick={handleSave}>
            {saveAsNew ? "Create theme" : "Save theme"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
