"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import {
  createFormAction,
  type CreateFormActionState,
} from "./create-form.action";
import { ErrorMessage } from "@/components/forms/error-message";
import { Spinner } from "@/components/loaders/spinner";
import FormSuccessMessage from "@/components/forms/form-success-message";
import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

import { ServerActionState } from "@/lib/utils/zod-error-utils";
import type { Folder } from "@/lib/endatix-api/folders/types";
import { getSelectableCreateFolders } from "./resolve-default-create-folder";

const INITIAL_STATE: CreateFormActionState = ServerActionState.emptyState();

type CreateFormWizardFields = {
  requireFolderAssignment?: boolean;
  folders?: Folder[];
  defaultFolderId?: string;
  defaultFolderName?: string;
};

type CreateFormWizardProps = CreateFormWizardFields &
  (
    | { onCancel: () => void; cancelHref?: never }
    | { onCancel?: never; cancelHref?: string }
  );

export default function CreateFormWizard({
  requireFolderAssignment = false,
  folders = [],
  defaultFolderId,
  defaultFolderName,
  cancelHref = "/forms",
  onCancel,
}: Readonly<CreateFormWizardProps>) {
  const router = useRouter();
  const normalizedDefaultFolderId = defaultFolderId
    ? String(defaultFolderId)
    : undefined;
  const selectableFolders = getSelectableCreateFolders(
    folders,
    normalizedDefaultFolderId,
    defaultFolderName,
  );
  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    normalizedDefaultFolderId ?? "",
  );
  const [state, formAction, isPending] = useActionState(
    createFormAction,
    INITIAL_STATE,
  );
  const isFormCreatedState = state?.isSuccess && state?.formId;
  const isFolderRequiredAndMissing =
    requireFolderAssignment && selectedFolderId.length === 0;
  const showEmptyFolderOption =
    !requireFolderAssignment || !normalizedDefaultFolderId;

  useEffect(() => {
    if (normalizedDefaultFolderId) {
      setSelectedFolderId(normalizedDefaultFolderId);
      return;
    }

    setSelectedFolderId(state?.data?.folderId ?? "");
  }, [normalizedDefaultFolderId, state?.data?.folderId]);

  useEffect(() => {
    if (isFormCreatedState) {
      toast.success({
        title: "Form created successfully!",
        description: "Opening form designer...",
      });
      setTimeout(() => {
        router.push(`/forms/${state?.formId}/design`);
      }, 400);
    }
  }, [isFormCreatedState, router, state?.formId]);

  return (
    <form action={formAction} className="space-y-6">
      {state?.formErrors && state.formErrors.length > 0 && (
        <div className="rounded-md bg-destructive/15 p-4">
          <ErrorMessage message={state.formErrors} />
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            placeholder="Enter form's name"
            defaultValue={state?.data?.name}
            required
            disabled={isPending}
          />
          {state?.errors?.name && <ErrorMessage message={state.errors.name} />}
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            name="description"
            placeholder="Enter form's description"
            defaultValue={state?.data?.description}
            rows={3}
            disabled={isPending}
          />
        </div>
        {state?.errors?.description && (
          <ErrorMessage message={state.errors.description} />
        )}

        {(requireFolderAssignment || folders.length > 0) && (
          <div className="space-y-2">
            <Label htmlFor="folderId">
              Folder
              {requireFolderAssignment ? (
                <span className="text-destructive"> *</span>
              ) : null}
            </Label>
            <select
              id="folderId"
              name="folderId"
              value={selectedFolderId}
              onChange={(event) => setSelectedFolderId(event.target.value)}
              disabled={isPending}
              required={requireFolderAssignment}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {showEmptyFolderOption ? (
                <option value="">
                  {requireFolderAssignment ? "Select a folder" : "No folder"}
                </option>
              ) : null}
              {selectableFolders.map((folder) => (
                <option key={folder.id} value={String(folder.id)}>
                  {folder.name}
                </option>
              ))}
            </select>
            {state?.errors?.folderId && (
              <ErrorMessage message={state.errors.folderId} />
            )}
            {requireFolderAssignment && (
              <p className="text-sm text-muted-foreground">
                A folder is required by your organization policy. If not
                selected, the server will return a validation message.
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
      </div>

      <div className="flex justify-end space-x-2">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
        ) : (
          <Button variant="outline" asChild disabled={isPending}>
            <Link href={{ pathname: cancelHref }}>Cancel</Link>
          </Button>
        )}
        <Button
          type="submit"
          disabled={isPending || isFolderRequiredAndMissing}
        >
          {isPending && <Spinner className="mr-2 h-4 w-4" />}
          {isPending ? "Creating your form..." : "Create Form"}
        </Button>
      </div>

      {isFormCreatedState && (
        <div className="flex justify-center">
          <FormSuccessMessage
            title="Form created successfully!"
            message="Opening form designer..."
            variant="compact"
            className="mt-4"
          />
        </div>
      )}
    </form>
  );
}
