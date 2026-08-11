"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import type { DataListDetails } from "@/lib/endatix-api/data-lists/types";
import { getFormattedDate } from "@/lib/utils";
import { ArrowLeft, ChevronDown, Download, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { ReplaceItemsDialog } from "../../replace-items/ui/replace-items-dialog";
import { useRouter } from "next/navigation";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { Result } from "@/lib/result";
import { downloadTranslationsCsvAction } from "../../translations/translations-csv.action";
import type { DataListSourceFormat } from "../../add-items/data-list-items-input";
import { serializeDataListItemsJson } from "../../utils";
import { DataListItemsTable } from "./data-list-items-table";
import { LocaleCatalogPanel } from "./locale-catalog-panel";

interface DataListDetailsPageProps {
  initialDetails: DataListDetails;
  openReplaceOnLoad?: boolean;
}

export function DataListDetailsPage({
  initialDetails,
  openReplaceOnLoad = false,
}: Readonly<DataListDetailsPageProps>) {
  const [details, setDetails] = useState(initialDetails);
  const [isReplaceDialogOpen, setIsReplaceDialogOpen] =
    useState(openReplaceOnLoad);
  const [replaceInitialFormat, setReplaceInitialFormat] =
    useState<DataListSourceFormat>("json");
  const [isDownloadPending, startDownloadTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (openReplaceOnLoad) {
      setIsReplaceDialogOpen(true);
    }
  }, [openReplaceOnLoad]);

  const handleOpenCloseReplaceDialog = (open: boolean): void => {
    setIsReplaceDialogOpen(open);
    if (!open) {
      setReplaceInitialFormat("json");
      const validationResult = validateEndatixId(details.id, "dataListId");
      const routerAction = (): void =>
        Result.isError(validationResult)
          ? router.back()
          : router.push(`/data-lists/${validationResult.value}`);

      routerAction();
    }
  };

  const openReplace = (format: DataListSourceFormat = "json"): void => {
    setReplaceInitialFormat(format);
    setIsReplaceDialogOpen(true);
  };

  const handleDownloadCsv = (): void => {
    startDownloadTransition(async () => {
      const result = await downloadTranslationsCsvAction(String(details.id));
      if (Result.isError(result)) {
        toast.error(result.message);
        return;
      }

      const blob = new Blob([result.value.csv], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.value.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    });
  };

  const handleDownloadJson = (): void => {
    const json = serializeDataListItemsJson(details.items);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `data-list-${details.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("JSON downloaded");
  };

  const availableLocales = details.availableLocales ?? [];

  return (
    <>
      <div className="mb-4">
        <Button variant="outline" asChild>
          <Link href="/data-lists">
            <ArrowLeft className="h-4 w-4" />
            Back to Data Lists
          </Link>
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {details.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {details.description || "No description"}
            </p>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>
                Created:{" "}
                {getFormattedDate(details.createdAt as Date | null | undefined)}
              </span>
              <span>
                Modified: {getFormattedDate(details.modifiedAt as Date | null)}
              </span>
              <span>
                {details.items.length} item
                {details.items.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isDownloadPending}>
                  <Download className="h-4 w-4" />
                  Download
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadCsv}>
                  Download CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadJson}>
                  Download JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4" />
                  Upload
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openReplace("csv")}>
                  Upload CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openReplace("json")}>
                  Upload JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <LocaleCatalogPanel details={details} onUpdated={setDetails} />

        <DataListItemsTable
          items={details.items}
          availableLocales={availableLocales}
          defaultLocale={details.defaultLocale}
        />
      </div>

      <ReplaceItemsDialog
        key={`${details.id}-${replaceInitialFormat}-${isReplaceDialogOpen}`}
        open={isReplaceDialogOpen}
        onOpenChange={handleOpenCloseReplaceDialog}
        dataListId={String(details.id)}
        title={details.name}
        availableLocales={availableLocales}
        defaultLocale={details.defaultLocale}
        initialFormat={replaceInitialFormat}
        onReplaced={(updated) => {
          setDetails(updated);
          toast.success("Data list details updated");
        }}
      />
    </>
  );
}
