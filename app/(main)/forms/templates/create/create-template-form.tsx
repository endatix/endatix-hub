"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createTemplateAction,
  type CreateTemplateActionState,
} from "@/features/form-templates/application/create-template.action";
import Link from "next/link";
import PageTitle from "@/components/headings/page-title";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { unstable_rethrow, useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";
import type { TemplateCreateContext } from "@/features/form-templates/application/get-template-create-context.action";
import { HubPageLoadError } from "@/components/error-handling/error-page/hub-page-load-error";
import { Result } from "@/lib/result";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorMessage } from "@/components/forms/error-message";
import { ServerActionState } from "@/lib/utils/zod-error-utils";

const NO_FOLDER_ID = "__none__";
const INITIAL_STATE: CreateTemplateActionState = ServerActionState.emptyState();

// Submissions before hydration can be replayed without the form's submit guard.
const subscribeToHydration = () => () => {};
const hydrated = () => true;
const prerendered = () => false;

function unconfirmedCreation(
  error: unknown,
  data: FormData,
): CreateTemplateActionState {
  unstable_rethrow(error);
  return {
    isSuccess: false,
    data: {
      name: data.get("name")?.toString(),
      description: data.get("description")?.toString(),
      folderId: data.get("folderId")?.toString(),
    },
    formErrors: [
      "Could not confirm creation. Check your templates before trying again.",
    ],
  };
}

function useOpenCreatedTemplate(templateId?: string) {
  const router = useRouter();
  useEffect(() => {
    if (!templateId) return;
    toast.success({
      title: "Form template created successfully",
      description: "Opening template editor...",
    });
    router.push(`/forms/templates/${templateId}`);
  }, [router, templateId]);
}

function useCreateTemplate() {
  const submitting = useRef(false);
  const ready = useSyncExternalStore(subscribeToHydration, hydrated, prerendered);
  async function submit(previous: CreateTemplateActionState, data: FormData) {
    const result = await createTemplateAction(previous, data).catch((error) =>
      unconfirmedCreation(error, data),
    );
    submitting.current = Boolean(result.isSuccess && result.templateId);
    return result;
  }
  const [state, action, pending] = useActionState(submit, INITIAL_STATE);
  const createdId = state.isSuccess ? state.templateId : undefined;
  useOpenCreatedTemplate(createdId);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (submitting.current) event.preventDefault();
    else submitting.current = true;
  }
  return { state, action, ready, isPending: pending || Boolean(createdId), onSubmit };
}

export default function CreateTemplateForm({
  context,
}: Readonly<{ context: Result<TemplateCreateContext> }>) {
  const { state, action, ready, isPending, onSubmit } = useCreateTemplate();
  const [selectedFolderId, setSelectedFolderId] =
    useState<string>(NO_FOLDER_ID);

  useEffect(() => {
    if (state?.data?.folderId) {
      setSelectedFolderId(state.data.folderId);
    } else {
      setSelectedFolderId(NO_FOLDER_ID);
    }
  }, [state?.data?.folderId]);

  if (Result.isError(context)) return <HubPageLoadError result={context} />;
  const { folders, requireFolderAssignment } = context.value;

  return (
    <>
      <PageTitle title="Create Form Template" />
      <div className="container max-w-2xl py-6">
        <div className="mb-6">
          {isPending ? (
            <span aria-disabled="true">← Back to templates</span>
          ) : (
            <Link
              href="/forms/templates"
              className="text-primary hover:underline"
            >
              ← Back to templates
            </Link>
          )}
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-6 text-2xl font-semibold">
            Create a new form template
          </h2>
          <p className="mb-6 text-muted-foreground">
            Form templates let you create reusable forms that can be filled out
            multiple times.
          </p>

          <form action={action} onSubmit={onSubmit} className="space-y-6">
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
                  placeholder="Enter template name"
                  defaultValue={state?.data?.name}
                  required
                  disabled={isPending}
                />
                {state?.errors?.name && (
                  <ErrorMessage message={state.errors.name} />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Enter template description"
                  defaultValue={state?.data?.description}
                  rows={3}
                  disabled={isPending}
                />
              </div>
              {folders.length > 0 ? (
                <div className="space-y-2">
                  <Label htmlFor="folderId">
                    Folder
                    {requireFolderAssignment ? (
                      <span className="text-destructive"> *</span>
                    ) : (
                      " (optional)"
                    )}
                  </Label>
                  <input
                    type="hidden"
                    name="folderId"
                    value={
                      selectedFolderId === "__none__" ? "" : selectedFolderId
                    }
                  />
                  <Select
                    value={selectedFolderId}
                    onValueChange={setSelectedFolderId}
                    disabled={isPending}
                  >
                    <SelectTrigger id="folderId" className="w-full">
                      <SelectValue
                        placeholder={
                          requireFolderAssignment
                            ? "Select a folder"
                            : "No folder"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="__none__">
                          {requireFolderAssignment
                            ? "Select a folder"
                            : "No folder"}
                        </SelectItem>
                        {folders.map((folder) => (
                          <SelectItem key={folder.id} value={folder.id}>
                            {folder.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {state?.errors?.folderId && (
                    <ErrorMessage message={state.errors.folderId} />
                  )}
                  {requireFolderAssignment && (
                    <p className="text-sm text-muted-foreground">
                      A folder is required by your organization policy. If not
                      selected, the server will return a validation message.
                    </p>
                  )}
                </div>
              ) : null}
              {requireFolderAssignment && folders.length === 0 ? (
                <p className="text-sm text-destructive">
                  No active folders exist. Create a folder under Forms → Folders
                  before creating a template.
                </p>
              ) : null}
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                asChild={!isPending}
                disabled={isPending}
              >
                {isPending ? (
                  "Cancel"
                ) : (
                  <Link href="/forms/templates">Cancel</Link>
                )}
              </Button>
              <Button type="submit" disabled={!ready || isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Template"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
