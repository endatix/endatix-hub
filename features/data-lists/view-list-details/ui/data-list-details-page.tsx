"use client";

import { Button } from "@/components/ui/button";
import {
  BackToTableButton,
  CellDate,
  createPagedTableFooterProps,
  PagedTableFooter,
  TableSearchInput,
} from "@/components/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import type { DataListDetails } from "@/lib/endatix-api/data-lists/types";
import type { DataListItemsPage } from "@/lib/endatix-api/data-lists/data-lists";
import { useListUrlState } from "@/lib/list-page/use-list-url-state";
import { TelemetryLogger } from "@/features/telemetry";
import { withBasePath } from "@/lib/hosting";
import { formatInteger } from "@/lib/utils/formatters";
import {
  getFilenameFromContentDisposition,
  initiateFileDownload,
} from "@/lib/utils/files-download";
import { ChevronDown, Download, Upload } from "lucide-react";
import type { Route } from "next";
import { Suspense, use, useEffect, useState, useTransition } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ReplaceItemsDialog } from "../../replace-items/ui/replace-items-dialog";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { Result } from "@/lib/result";
import type { DataListSourceFormat } from "../../add-items/data-list-items-input";
import { DataListItemsTable } from "./data-list-items-table";
import { LocaleCatalogPanel } from "./locale-catalog-panel";
import {
  DATA_LISTS_LIST_PATH,
  DATA_LISTS_TABLE_KEY,
  dataListsListHrefFromQuery,
  parseDataListsReturnQuery,
} from "../../view-lists/utils";

const CSV_EXPORT_LOGGER = "data-lists.exportCsv";

interface DataListDetailsPageProps {
  initialDetails: DataListDetails;
  itemsPromise: Promise<DataListItemsPage>;
  openReplaceOnLoad?: boolean;
}

export function DataListDetailsPage({
  initialDetails,
  itemsPromise,
  openReplaceOnLoad = false,
}: Readonly<DataListDetailsPageProps>) {
  const [details, setDetails] = useState(initialDetails);
  const [isReplaceDialogOpen, setIsReplaceDialogOpen] =
    useState(openReplaceOnLoad);
  const [openedReplaceFromLoad, setOpenedReplaceFromLoad] =
    useState(openReplaceOnLoad);
  const [replaceInitialFormat, setReplaceInitialFormat] =
    useState<DataListSourceFormat>("json");
  const [isDownloadPending, startDownloadTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dataListIdResult = validateEndatixId(String(details.id), "dataListId");

  // Items pagination/search is keyed off the URL, but the item set just
  // changed size (or content) — an out-of-range `page` or stale `search`
  // would otherwise render a false "no items" empty state after replace.
  const resetItemsListState = (): void => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (!nextParams.has("page") && !nextParams.has("search")) {
      return;
    }

    nextParams.delete("page");
    nextParams.delete("search");
    const query = nextParams.toString();
    router.replace((query ? `${pathname}?${query}` : pathname) as Route);
  };

  useEffect(() => {
    if (!openReplaceOnLoad) {
      return;
    }

    const idResult = validateEndatixId(String(details.id), "dataListId");
    if (Result.isError(idResult)) {
      toast.error(idResult.message);
      return;
    }

    setOpenedReplaceFromLoad(true);
    setIsReplaceDialogOpen(true);
  }, [openReplaceOnLoad, details.id]);

  const handleOpenCloseReplaceDialog = (open: boolean): void => {
    setIsReplaceDialogOpen(open);
    if (!open) {
      setReplaceInitialFormat("json");
      if (openedReplaceFromLoad) {
        setOpenedReplaceFromLoad(false);
        router.back();
      }
    }
  };

  const openReplace = (format: DataListSourceFormat = "json"): void => {
    if (Result.isError(dataListIdResult)) {
      toast.error(dataListIdResult.message);
      return;
    }

    setOpenedReplaceFromLoad(false);
    setReplaceInitialFormat(format);
    setIsReplaceDialogOpen(true);
  };

  const handleDownloadJson = (): void => {
    downloadExport("json");
  };

  const downloadExport = (format: "csv" | "json"): void => {
    if (Result.isError(dataListIdResult)) {
      toast.error(dataListIdResult.message);
      return;
    }

    const dataListId = dataListIdResult.value;
    const fallbackName =
      format === "json"
        ? `data-list-${dataListId}.json`
        : `data-list-${dataListId}-translations.csv`;
    const successMessage =
      format === "json" ? "JSON downloaded" : "CSV downloaded";
    const errorMessage =
      format === "json"
        ? "Failed to download JSON"
        : "Failed to download translations CSV";

    startDownloadTransition(async () => {
      try {
        const response = await fetch(
          withBasePath(`/api/data-lists/${dataListId}/export?format=${format}`),
        );

        if (!response.ok) {
          let message = errorMessage;
          try {
            const payload = (await response.json()) as { error?: string };
            if (payload.error) {
              message = payload.error;
            }
          } catch (error) {
            TelemetryLogger.error(
              "Failed to parse data list export error response",
              error,
              {
                "http.status_code": response.status,
                "error.type":
                  error instanceof Error ? error.name : typeof error,
              },
              CSV_EXPORT_LOGGER,
            );
          }
          toast.error(message);
          return;
        }

        const blob = await response.blob();
        const fileName = getFilenameFromContentDisposition(
          response.headers,
          fallbackName,
        );
        initiateFileDownload(blob, fileName);
        toast.success(successMessage);
      } catch {
        toast.error(errorMessage);
      }
    });
  };

  const handleDownloadCsv = (): void => {
    downloadExport("csv");
  };

  const availableLocales = details.availableLocales ?? [];

  return (
    <>
      <div className="mb-4">
        <BackToTableButton
          tableKey={DATA_LISTS_TABLE_KEY}
          fallbackHref={DATA_LISTS_LIST_PATH}
          parse={parseDataListsReturnQuery}
          buildHref={dataListsListHrefFromQuery}
          text="Back to Data Lists"
        />
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
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="font-medium text-foreground/70">Created</span>
                <CellDate date={details.createdAt} />
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="font-medium text-foreground/70">Modified</span>
                <CellDate date={details.modifiedAt} />
              </span>
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {formatInteger(details.itemsCount)} item
                {details.itemsCount === 1 ? "" : "s"}
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

        <LocaleCatalogPanel
          details={details}
          onUpdated={(updated) => {
            setDetails(updated);
            router.refresh();
          }}
        />

        <DataListItemsSection
          itemsPromise={itemsPromise}
          availableLocales={availableLocales}
          defaultLocale={details.defaultLocale}
        />
      </div>

      <ReplaceItemsDialog
        key={`${details.id}-${replaceInitialFormat}-${isReplaceDialogOpen}`}
        open={isReplaceDialogOpen}
        onOpenChange={handleOpenCloseReplaceDialog}
        dataListId={
          Result.isSuccess(dataListIdResult) ? dataListIdResult.value : ""
        }
        title={details.name}
        availableLocales={availableLocales}
        defaultLocale={details.defaultLocale}
        initialFormat={replaceInitialFormat}
        onReplaced={(updated) => {
          setDetails(updated);
          resetItemsListState();
          router.refresh();
          toast.success("Data list details updated");
        }}
      />
    </>
  );
}

function DataListItemsSection({
  itemsPromise,
  availableLocales,
  defaultLocale,
}: Readonly<{
  itemsPromise: Promise<DataListItemsPage>;
  availableLocales: string[];
  defaultLocale?: string;
}>) {
  const { search, setSearch } = useListUrlState();

  return (
    <div className="space-y-3">
      <TableSearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search items by value or label"
        ariaLabel="Search data list items"
      />
      <Suspense
        fallback={
          <div className="space-y-3">
            <Skeleton className="h-64 w-full" />
          </div>
        }
      >
        <DataListItemsPanel
          itemsPromise={itemsPromise}
          availableLocales={availableLocales}
          defaultLocale={defaultLocale}
        />
      </Suspense>
    </div>
  );
}

function DataListItemsPanel({
  itemsPromise,
  availableLocales,
  defaultLocale,
}: Readonly<{
  itemsPromise: Promise<DataListItemsPage>;
  availableLocales: string[];
  defaultLocale?: string;
}>) {
  const paged = use(itemsPromise);
  const { updateUrl, searchParams } = useListUrlState();
  const footerProps = createPagedTableFooterProps(paged, "items", updateUrl);
  const hasSearch = Boolean(searchParams.get("search")?.trim());

  return (
    <DataListItemsTable
      items={[...paged.items]}
      availableLocales={availableLocales}
      defaultLocale={defaultLocale}
      emptyMessage={
        hasSearch
          ? "No items match the current search."
          : "No items in this list."
      }
      footer={<PagedTableFooter {...footerProps} variant="surface" />}
    />
  );
}
