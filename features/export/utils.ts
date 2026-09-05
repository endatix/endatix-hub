import {
  DELIVERY_TO_FILE_KIND,
  type ExportDeliveryFormat,
  type ExportFormatListItem,
} from "@/lib/endatix-api/reporting/export-format-types";
import { getReportingExportWire } from "@/lib/endatix-api/reporting/reporting-export-wire";
import type { FileKindKey } from "@/lib/file-kinds";

export function getExportDeliveryFileKind(
  deliveryFormat: ExportDeliveryFormat,
): FileKindKey | undefined {
  return DELIVERY_TO_FILE_KIND[deliveryFormat];
}

export function getExportWireKeyFileKind(
  wireKey: string,
): FileKindKey | undefined {
  return getReportingExportWire(wireKey)?.fileKind;
}

export function getExportFormatFileKind(
  format: Pick<ExportFormatListItem, "wireKey" | "deliveryFormat">,
): FileKindKey | undefined {
  return (
    getExportWireKeyFileKind(format.wireKey) ??
    getExportDeliveryFileKind(format.deliveryFormat)
  );
}
