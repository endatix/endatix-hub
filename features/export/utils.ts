import type { LucideIcon } from "lucide-react";
import { getFileKindIcon } from "@/lib/file-kinds/file-kind-icons";
import {
  DELIVERY_TO_FILE_KIND,
  type ExportDeliveryFormat,
} from "@/lib/endatix-api/reporting/export-format-types";
import { getReportingExportWire } from "@/lib/endatix-api/reporting/reporting-export-wire";

export function getExportDeliveryFormatIcon(
  deliveryFormat: ExportDeliveryFormat,
): LucideIcon {
  return getFileKindIcon(DELIVERY_TO_FILE_KIND[deliveryFormat]);
}

export function getExportWireKeyIcon(wireKey: string): LucideIcon {
  const fileKind = getReportingExportWire(wireKey)?.fileKind ?? "csv";
  return getFileKindIcon(fileKind);
}
