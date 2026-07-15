/**
 * Form-scoped codebook exports (schema JSON, Shoji/Crunch projection).
 * Today codebook downloads are triggered from the submissions export picker;
 * a dedicated form-level download UI can live in this slice later.
 */
export {
  HARDCODED_CODEBOOK_EXPORT_OPTIONS,
  isCodebookExportFormat,
  type CodebookExportFormat,
} from "./codebook-export-formats";
