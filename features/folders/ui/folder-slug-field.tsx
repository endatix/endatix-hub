"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getFolderSlugPreview } from "@/features/folders/folder-slug-utils";
import { Link2, Pencil } from "lucide-react";

interface FolderSlugFieldProps {
  labelId: string;
  inputId: string;
  previewId: string;
  slug: string;
  name: string;
  slugEditable: boolean;
  onSlugChange: (value: string) => void;
  onSlugEditableChange: (editable: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
}

export function FolderSlugField({
  labelId,
  inputId,
  previewId,
  slug,
  name,
  slugEditable,
  onSlugChange,
  onSlugEditableChange,
  disabled = false,
  placeholder,
  hint,
}: Readonly<FolderSlugFieldProps>) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={previewId} id={labelId}>
        URL slug
      </Label>
      <div className="flex items-center gap-2">
        {slugEditable ? (
          <Input
            id={inputId}
            value={slug}
            onChange={(event) => onSlugChange(event.target.value)}
            autoComplete="off"
            disabled={disabled}
            className="font-mono"
            placeholder={placeholder}
          />
        ) : (
          <div
            id={previewId}
            className="flex min-h-10 flex-1 items-center gap-2 rounded-lg border border-border/50 bg-muted/40 px-3 text-sm"
          >
            <Link2 className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate font-mono text-xs sm:text-sm">
              {getFolderSlugPreview(name, slug)}
            </span>
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onSlugEditableChange(!slugEditable)}
          aria-label={slugEditable ? "Hide slug editor" : "Edit slug"}
          disabled={disabled}
        >
          <Pencil className="size-4" />
        </Button>
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
