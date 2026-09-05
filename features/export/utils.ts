import {
  DELIVERY_TO_FILE_KIND,
  type ExportDeliveryFormat,
  type ExportFormatListItem,
} from "@/lib/endatix-api/reporting/export-format-types";
import { getReportingExportWire } from "@/lib/endatix-api/reporting/reporting-export-wire";
import type { FileKindKey } from "@/lib/file-kinds";

/**
 * File kind resolvers for export pickers. They return the kind, not an icon,
 * so the icon family, size and tone stay owned by `FileKindIcon`.
 */

export function getExportDeliveryFileKind(
  deliveryFormat: ExportDeliveryFormat,
): FileKindKey | undefined {
  return DELIVERY_TO_FILE_KIND[deliveryFormat];
}

/**
 * `undefined` for a wire key this Hub build does not know — the caller renders
 * the generic file glyph rather than guessing a kind.
 */
export function getExportWireKeyFileKind(
  wireKey: string,
): FileKindKey | undefined {
  return getReportingExportWire(wireKey)?.fileKind;
}

/**
 * Tenant format rows carry both a wire key and the delivery enum. The wire key
 * is more specific (`csv-shoji` → csv); the enum is the fallback that keeps a
 * server-side format newer than this build on the right icon.
 */
export function getExportFormatFileKind(
  format: Pick<ExportFormatListItem, "wireKey" | "deliveryFormat">,
): FileKindKey | undefined {
  return (
    getExportWireKeyFileKind(format.wireKey) ??
    getExportDeliveryFileKind(format.deliveryFormat)
  );
}
