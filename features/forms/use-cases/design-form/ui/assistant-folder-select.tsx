"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormAssistant } from "../form-assistant.context";

/**
 * When the tenant requires folder assignment and multiple folders exist,
 * the user must pick a target folder before the assistant can create a new form.
 */
export function AssistantFolderSelect() {
  const fieldId = useId();
  const {
    requireFolderForNewForms,
    assignableFolders,
    assignFolderId,
    setAssignFolderId,
  } = useFormAssistant();

  if (!requireFolderForNewForms || assignableFolders.length <= 1) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>Folder</Label>
      <Select
        value={assignFolderId ?? ""}
        onValueChange={(v) => setAssignFolderId(v.length > 0 ? v : undefined)}
      >
        <SelectTrigger id={fieldId} className="w-full">
          <SelectValue placeholder="Select a folder" />
        </SelectTrigger>
        <SelectContent>
          {assignableFolders.map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {f.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Your organization requires every new form to belong to a folder.
      </p>
    </div>
  );
}
