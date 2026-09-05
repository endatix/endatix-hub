"use client";

import { use, useActionState, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  ResponsivePanel,
  ResponsivePanelBody,
  ResponsivePanelDescription,
  ResponsivePanelFooter,
  ResponsivePanelHeader,
  ResponsivePanelTitle,
} from "@/components/ui/responsive-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DATA_TABLE_ELEMENT_CLASS_NAME,
  DATA_TABLE_SHRINK_WRAP_CLASS_NAME,
  DataTableEmpty,
  DataTableSurface,
  dataTableBodyCellClassName,
  dataTableBodyRowClassName,
  dataTableColumnLabelClassName,
  dataTableHeaderCellClassName,
} from "@/components/table";
import { FileKindLabel } from "@/components/common/file-kind-icon";
import { StatusBadge } from "@/components/common/status-badge";
import { toast } from "@/components/ui/toast";
import type {
  ColumnAliasNamingConventionDto,
  ExportCapabilityDto,
  ExportFormatListItem,
  ExportMappingListItem,
} from "@/lib/endatix-api/reporting/reporting";
import {
  getExportFormatLabel,
  getExportFormatSettingsSummary,
  getExportFormatTypeLabel,
  canCreateExportFormat,
} from "@/lib/endatix-api/reporting/export-format-types";
import {
  createExportFormatAction,
  deleteExportFormatAction,
  updateExportFormatAction,
  upsertTenantDefaultExportMappingAction,
  type ExportFormatActionState,
} from "../manage-export-formats.action";
import { getExportFormatFileKind } from "@/features/export/utils";
import { ExportFormatFormFields } from "./export-format-form-fields";

interface ExportFormatsSettingsProps {
  formatsPromise: Promise<ExportFormatListItem[]>;
  mappingsPromise: Promise<ExportMappingListItem[]>;
  capabilitiesPromise: Promise<ExportCapabilityDto[]>;
  namingConventionsPromise: Promise<ColumnAliasNamingConventionDto[]>;
}

const initialActionState: ExportFormatActionState = {
  isSuccess: false,
  message: "",
};

function shouldToastActionState(state: ExportFormatActionState): boolean {
  if (!state.message) {
    return false;
  }

  // Field validation errors are shown inline — skip error toasts for them.
  if (!state.isSuccess && state.errors) {
    return false;
  }

  return true;
}

export function ExportFormatsSettings({
  formatsPromise,
  mappingsPromise,
  capabilitiesPromise,
  namingConventionsPromise,
}: Readonly<ExportFormatsSettingsProps>) {
  const formats = use(formatsPromise);
  const mappings = use(mappingsPromise);
  const capabilities = use(capabilitiesPromise);
  const namingConventions = use(namingConventionsPromise);
  const tenantDefault = mappings.find(
    (mapping) => mapping.isDefault && !mapping.surveyTypeId,
  );
  const submissionFormats = formats.filter(
    (format) => format.exportTarget === "Submissions",
  );
  const canCreate = canCreateExportFormat(capabilities, namingConventions);

  const [createOpen, setCreateOpen] = useState(false);
  const [createFormKey, setCreateFormKey] = useState(0);
  const [editingFormat, setEditingFormat] =
    useState<ExportFormatListItem | null>(null);
  const [formatToDelete, setFormatToDelete] =
    useState<ExportFormatListItem | null>(null);
  const [defaultFormatId, setDefaultFormatId] = useState(
    tenantDefault?.exportFormatId ?? "",
  );
  const [isUpdatingDefault, setIsUpdatingDefault] = useState(false);

  const [createState, createFormAction, isCreating] = useActionState(
    createExportFormatAction,
    initialActionState,
  );
  const [updateState, updateFormAction, isUpdating] = useActionState(
    updateExportFormatAction,
    initialActionState,
  );

  useEffect(() => {
    if (!shouldToastActionState(createState)) {
      return;
    }

    toast[createState.isSuccess ? "success" : "error"]({
      title: createState.isSuccess ? "Saved" : "Error",
      description: createState.message,
    });

    if (createState.isSuccess) {
      setCreateOpen(false);
    }
  }, [createState]);

  useEffect(() => {
    if (!shouldToastActionState(updateState)) {
      return;
    }

    toast[updateState.isSuccess ? "success" : "error"]({
      title: updateState.isSuccess ? "Saved" : "Error",
      description: updateState.message,
    });

    if (updateState.isSuccess) {
      setEditingFormat(null);
    }
  }, [updateState]);

  const handleDeleteConfirm = async () => {
    if (!formatToDelete) {
      return;
    }

    const result = await deleteExportFormatAction(formatToDelete.id);
    toast[result.isSuccess ? "success" : "error"]({
      title: result.isSuccess ? "Deleted" : "Error",
      description: result.message,
    });
    setFormatToDelete(null);
  };

  const handleDefaultChange = async (exportFormatId: string) => {
    if (isUpdatingDefault) {
      return;
    }

    const previousDefaultId = defaultFormatId;
    setDefaultFormatId(exportFormatId);
    setIsUpdatingDefault(true);

    try {
      const result =
        await upsertTenantDefaultExportMappingAction(exportFormatId);
      if (!result.isSuccess) {
        setDefaultFormatId(previousDefaultId);
      }

      toast[result.isSuccess ? "success" : "error"]({
        title: result.isSuccess ? "Default updated" : "Error",
        description: result.message,
      });
    } finally {
      setIsUpdatingDefault(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Tenant default export format</CardTitle>
          <CardDescription>
            Used when exporting submissions unless another format is chosen
            explicitly.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-md">
          <div className="flex flex-col gap-2">
            <Label htmlFor="default-export-format">Default format</Label>
            <Select
              value={defaultFormatId}
              onValueChange={handleDefaultChange}
              disabled={submissionFormats.length === 0 || isUpdatingDefault}
            >
              <SelectTrigger id="default-export-format">
                <SelectValue placeholder="Select default export format" />
              </SelectTrigger>
              <SelectContent>
                {submissionFormats.map((format) => (
                  <SelectItem key={format.id} value={format.id}>
                    <FileKindLabel kind={getExportFormatFileKind(format)}>
                      {getExportFormatLabel(format)}
                    </FileKindLabel>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-4">
        <div className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-lg font-semibold tracking-tight">
              Export formats
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure how submissions and codebooks are exported for this
              tenant.
            </p>
          </div>
          <Button
            type="button"
            disabled={!canCreate}
            onClick={() => {
              setCreateFormKey((current) => current + 1);
              setCreateOpen(true);
            }}
          >
            <Plus data-icon="inline-start" />
            Create format
          </Button>
        </div>

        <DataTableSurface data-slot="export-formats-table">
          {formats.length === 0 ? (
            <DataTableEmpty>
              No export formats yet. Create one to get started.
            </DataTableEmpty>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table className={DATA_TABLE_ELEMENT_CLASS_NAME}>
                <TableHeader className="bg-surface-container-low">
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableHead
                      className={dataTableHeaderCellClassName({
                        isStatic: true,
                      })}
                    >
                      <span className={dataTableColumnLabelClassName()}>
                        Name
                      </span>
                    </TableHead>
                    <TableHead
                      className={dataTableHeaderCellClassName({
                        isStatic: true,
                      })}
                    >
                      <span className={dataTableColumnLabelClassName()}>
                        Export type
                      </span>
                    </TableHead>
                    <TableHead
                      className={dataTableHeaderCellClassName({
                        isStatic: true,
                      })}
                    >
                      <span className={dataTableColumnLabelClassName()}>
                        Settings
                      </span>
                    </TableHead>
                    <TableHead
                      className={dataTableHeaderCellClassName({
                        isStatic: true,
                        className: `text-right ${DATA_TABLE_SHRINK_WRAP_CLASS_NAME}`,
                      })}
                    >
                      <span className={dataTableColumnLabelClassName()}>
                        Actions
                      </span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formats.map((format, index) => {
                    const isDefault = format.id === defaultFormatId;
                    const isEvenRow = index % 2 === 1;

                    return (
                      <TableRow
                        key={format.id}
                        className={dataTableBodyRowClassName({ isEvenRow })}
                      >
                        <TableCell
                          className={dataTableBodyCellClassName({ isEvenRow })}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">
                              {format.name}
                            </span>
                            {isDefault ? (
                              <StatusBadge tone="on" label="Default" />
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell
                          className={dataTableBodyCellClassName({
                            isEvenRow,
                            className: "text-sm text-muted-foreground",
                          })}
                        >
                          <FileKindLabel kind={getExportFormatFileKind(format)}>
                            {getExportFormatTypeLabel(format, capabilities)}
                          </FileKindLabel>
                        </TableCell>
                        <TableCell
                          className={dataTableBodyCellClassName({
                            isEvenRow,
                            className: "max-w-md text-sm text-muted-foreground",
                          })}
                        >
                          {getExportFormatSettingsSummary(
                            format,
                            namingConventions,
                          )}
                        </TableCell>
                        <TableCell
                          className={dataTableBodyCellClassName({
                            isEvenRow,
                            className: `text-right ${DATA_TABLE_SHRINK_WRAP_CLASS_NAME}`,
                          })}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Edit ${format.name}`}
                              onClick={() => setEditingFormat(format)}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${format.name}`}
                              onClick={() => setFormatToDelete(format)}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </DataTableSurface>
      </section>

      <ResponsivePanel
        desktopType="complex"
        open={createOpen}
        onOpenChange={setCreateOpen}
      >
        <form
          action={createFormAction}
          className="flex h-full min-h-0 flex-col"
        >
          <ResponsivePanelHeader>
            <ResponsivePanelTitle>Create export format</ResponsivePanelTitle>
            <ResponsivePanelDescription>
              Choose the export type first. Additional settings appear based on
              what you select.
            </ResponsivePanelDescription>
          </ResponsivePanelHeader>
          <ResponsivePanelBody>
            <ExportFormatFormFields
              key={`create-${createFormKey}`}
              mode="create"
              capabilities={capabilities}
              namingConventions={namingConventions}
              fieldErrors={createState.errors}
              defaultValues={createState.data}
            />
          </ResponsivePanelBody>
          <ResponsivePanelFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || !canCreate}>
              {isCreating ? "Creating…" : "Create format"}
            </Button>
          </ResponsivePanelFooter>
        </form>
      </ResponsivePanel>

      <ResponsivePanel
        desktopType="complex"
        open={editingFormat !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingFormat(null);
          }
        }}
      >
        {editingFormat ? (
          <form
            action={updateFormAction}
            className="flex h-full min-h-0 flex-col"
          >
            <input
              type="hidden"
              name="exportFormatId"
              value={editingFormat.id}
            />
            <ResponsivePanelHeader>
              <ResponsivePanelTitle>Edit export format</ResponsivePanelTitle>
              <ResponsivePanelDescription>
                Update the name and settings for {editingFormat.name}.
              </ResponsivePanelDescription>
            </ResponsivePanelHeader>
            <ResponsivePanelBody>
              <ExportFormatFormFields
                key={editingFormat.id}
                mode="edit"
                capabilities={capabilities}
                namingConventions={namingConventions}
                initialFormat={editingFormat}
                fieldErrors={updateState.errors}
                defaultValues={updateState.data}
              />
            </ResponsivePanelBody>
            <ResponsivePanelFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingFormat(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Saving…" : "Save changes"}
              </Button>
            </ResponsivePanelFooter>
          </form>
        ) : null}
      </ResponsivePanel>

      <AlertDialog
        open={formatToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setFormatToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete export format?</AlertDialogTitle>
            <AlertDialogDescription>
              {formatToDelete
                ? `This will permanently delete "${formatToDelete.name}". Existing exports already downloaded are not affected.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
