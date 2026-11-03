import type { EndatixApi } from "../endatix-api";
import type { ApiResult } from "../shared/api-result";
import type { NormalizedPagedResponse } from "../shared/paged-response";
import type { PagedResponse } from "../shared/types";
import { buildImportRejectionsEndpoint } from "./endpoints";
import {
  formAudiencePath,
  mapImportViewResult,
  mapRejectionsPageResult,
  requireEndatixId,
  requireFormAndEntityIds,
  type WireImportView,
} from "./mappers";
import {
  CURRENT_IMPORT,
  type AudienceImportMove,
  type AudienceImportRejectedRow,
  type AudienceImportView,
  type IndexedImportChunk,
  type StartAudienceImportRequest,
} from "./types";

export type AudienceImportRejectionsPage =
  NormalizedPagedResponse<AudienceImportRejectedRow>;

/** A form's staged import: start, chunks, reads, rejected rows and moves (`Audience` delegates here). */
export class StagedImports {
  constructor(private readonly endatix: EndatixApi) {}

  /** Starts a staged import; the rows follow in chunks. 409 while the form has an unfinished one. */
  async startImport(
    formId: string,
    body: StartAudienceImportRequest,
  ): Promise<ApiResult<AudienceImportView>> {
    const idCheck = requireEndatixId(formId, "formId");
    if (!idCheck.success) return idCheck;

    return mapImportViewResult(
      await this.endatix.post<WireImportView>(
        formAudiencePath(formId, "imports"),
        body,
      ),
    );
  }

  /** Stores one chunk; sending it again replaces it. The chunk that completes the file starts the Check. */
  async sendImportChunk(
    formId: string,
    importId: string,
    { index, ...chunk }: IndexedImportChunk,
  ): Promise<ApiResult<AudienceImportView>> {
    const idsCheck = requireFormAndEntityIds(formId, importId, "importId");
    if (!idsCheck.success) return idsCheck;

    return mapImportViewResult(
      await this.endatix.put<WireImportView>(
        formAudiencePath(formId, "imports", importId, "chunks", String(index)),
        chunk,
      ),
    );
  }

  /** One import, or with `current` the form's unfinished one (404 when there is none). */
  async getImport(
    formId: string,
    importId: string,
  ): Promise<ApiResult<AudienceImportView>> {
    const idsCheck =
      importId === CURRENT_IMPORT
        ? requireEndatixId(formId, "formId")
        : requireFormAndEntityIds(formId, importId, "importId");
    if (!idsCheck.success) return idsCheck;

    return mapImportViewResult(
      await this.endatix.get<WireImportView>(
        formAudiencePath(formId, "imports", importId),
      ),
    );
  }

  /** One page of the rows the import did not write, kept until 7 days after it finished. */
  async listImportRejections(
    formId: string,
    importId: string,
    page: number,
  ): Promise<ApiResult<AudienceImportRejectionsPage>> {
    const idsCheck = requireFormAndEntityIds(formId, importId, "importId");
    if (!idsCheck.success) return idsCheck;

    return mapRejectionsPageResult(
      await this.endatix.get<PagedResponse<AudienceImportRejectedRow>>(
        buildImportRejectionsEndpoint(formId, importId, page),
      ),
    );
  }

  async moveImport(
    formId: string,
    importId: string,
    status: AudienceImportMove,
  ): Promise<ApiResult<AudienceImportView>> {
    const idsCheck = requireFormAndEntityIds(formId, importId, "importId");
    if (!idsCheck.success) return idsCheck;

    return mapImportViewResult(
      await this.endatix.patch<WireImportView>(
        formAudiencePath(formId, "imports", importId),
        { status },
      ),
    );
  }
}
