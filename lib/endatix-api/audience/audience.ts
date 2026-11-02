import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import type { NormalizedPagedResponse } from "../shared/paged-response";
import type { PagedResponse } from "../shared/types";
import {
  buildLinksPreviewEndpoint,
  buildListAudiencePeopleEndpoint,
  linkBatchBody,
} from "./endpoints";
import {
  formAudiencePath,
  mapImportResult,
  mapRedeemedLinkResult,
  mapSettingsResult,
  mapTestSubmissionResult,
  type WireImport,
  type WireSettings,
  type WireRedeemedLink,
  type WireTestSubmission,
  mapIssuedLink,
  mapLinkBatch,
  mapLinksPreviewResult,
  mapPeoplePageResult,
  mapParticipantResult,
  mapPersonResult,
  mapProperty,
  mapPropertyResult,
  mapVariablesResult,
  requireEndatixId,
  requireFormAndEntityIds,
  type WireIssuedLink,
  type WireLinkBatch,
  type WireLinksPreview,
  type WireParticipant,
  type WirePerson,
  type WireProperty,
  type WireVariables,
} from "./mappers";
import {
  type AudienceParticipant,
  type AudiencePerson,
  type AudienceProperty,
  type IndexedImportChunk,
  type AudienceImportResult,
  type ImportAudienceCsvRequest,
  type AudienceImportMove,
  type AudienceSettings,
  type CreateAudiencePersonRequest,
  type CreateAudiencePropertyRequest,
  type ListAudiencePeopleRequest,
  type UpdateAudiencePersonRequest,
  type UpdateAudiencePropertyRequest,
  type StartAudienceImportRequest,
  type IssuedAudienceLink,
  type AudienceLinkBatch,
  type AudienceLinksPreview,
  type OpenedTestSubmission,
  type RedeemedAudienceLink,
  type UpdateAudienceSettingsRequest,
  type AudienceVariables,
  type AudienceVariablePreset,
} from "./types";
import { StagedImports } from "./staged-imports";

export type { AudienceImportRejectionsPage } from "./staged-imports";

export type AudiencePeoplePage = NormalizedPagedResponse<AudiencePerson>;

const SETTINGS_PATH = "/audience/settings";

export { buildListAudiencePeopleEndpoint };

export class Audience {
  private readonly imports: StagedImports;

  constructor(private readonly endatix: EndatixApi) {
    this.imports = new StagedImports(endatix);
  }

  async getSettings(): Promise<ApiResult<AudienceSettings>> {
    return mapSettingsResult(
      await this.endatix.get<WireSettings>(SETTINGS_PATH),
    );
  }

  async updateSettings(
    body: UpdateAudienceSettingsRequest,
  ): Promise<ApiResult<AudienceSettings>> {
    return mapSettingsResult(
      await this.endatix.put<WireSettings>(SETTINGS_PATH, body),
    );
  }

  async listProperties(formId: string): Promise<ApiResult<AudienceProperty[]>> {
    const idCheck = requireEndatixId(formId, "formId");
    if (!idCheck.success) {
      return idCheck;
    }

    const response = await this.endatix.get<WireProperty[]>(
      formAudiencePath(formId, "properties"),
    );
    if (!response.success) {
      return response;
    }

    return ApiResult.success(
      response.data.map((property) => mapProperty(property)),
    );
  }

  async createProperty(
    formId: string,
    body: CreateAudiencePropertyRequest,
  ): Promise<ApiResult<AudienceProperty>> {
    const idCheck = requireEndatixId(formId, "formId");
    if (!idCheck.success) {
      return idCheck;
    }

    return mapPropertyResult(
      await this.endatix.post<WireProperty>(
        formAudiencePath(formId, "properties"),
        body,
      ),
    );
  }

  async updateProperty(
    formId: string,
    propertyId: string,
    body: UpdateAudiencePropertyRequest,
  ): Promise<ApiResult<AudienceProperty>> {
    const idsCheck = requireFormAndEntityIds(formId, propertyId, "propertyId");
    if (!idsCheck.success) {
      return idsCheck;
    }

    return mapPropertyResult(
      await this.endatix.patch<WireProperty>(
        formAudiencePath(formId, "properties", propertyId),
        body,
      ),
    );
  }

  async deleteProperty(
    formId: string,
    propertyId: string,
  ): Promise<ApiResult<void>> {
    const idsCheck = requireFormAndEntityIds(formId, propertyId, "propertyId");
    if (!idsCheck.success) {
      return idsCheck;
    }

    return this.endatix.delete(
      formAudiencePath(formId, "properties", propertyId),
    );
  }

  async listPeople(
    formId: string,
    request: ListAudiencePeopleRequest = {},
  ): Promise<ApiResult<AudiencePeoplePage>> {
    const idCheck = requireEndatixId(formId, "formId");
    if (!idCheck.success) return idCheck;

    return mapPeoplePageResult(
      await this.endatix.get<PagedResponse<WirePerson>>(
        buildListAudiencePeopleEndpoint(formId, request),
      ),
    );
  }

  /** One participant by audience member id (not membership id), with their newest submissions. */
  async getParticipant(
    formId: string,
    memberId: string,
  ): Promise<ApiResult<AudienceParticipant>> {
    const idsCheck = requireFormAndEntityIds(formId, memberId, "memberId");
    if (!idsCheck.success) return idsCheck;

    return mapParticipantResult(
      await this.endatix.get<WireParticipant>(
        formAudiencePath(formId, "people", memberId),
      ),
    );
  }

  /** The form's Variables and Test participant values, for the designer's Preview as. */
  async getVariables(formId: string): Promise<ApiResult<AudienceVariables>> {
    const idCheck = requireEndatixId(formId, "formId");
    if (!idCheck.success) return idCheck;

    return mapVariablesResult(
      await this.endatix.get<WireVariables>(
        formAudiencePath(formId, "variables"),
      ),
    );
  }

  /**
   * Saves the designer's edited presets as Test participants, matched by identifier; nothing is
   * deleted, and a real participant sent back changed fails the whole save. Returns the variables
   * read again.
   */
  async saveTestParticipants(
    formId: string,
    presets: AudienceVariablePreset[],
  ): Promise<ApiResult<AudienceVariables>> {
    const idCheck = requireEndatixId(formId, "formId");
    if (!idCheck.success) return idCheck;

    return mapVariablesResult(
      await this.endatix.put<WireVariables>(
        formAudiencePath(formId, "variables", "test-participants"),
        { presets },
      ),
    );
  }

  /** One participant's values (real or test) by audience member id, for Preview as. */
  async getParticipantVariables(
    formId: string,
    memberId: string,
  ): Promise<ApiResult<AudienceVariablePreset>> {
    const idsCheck = requireFormAndEntityIds(formId, memberId, "memberId");
    if (!idsCheck.success) return idsCheck;

    return this.endatix.get<AudienceVariablePreset>(
      formAudiencePath(formId, "variables", "participants", memberId),
    );
  }

  async createPerson(
    formId: string,
    body: CreateAudiencePersonRequest,
  ): Promise<ApiResult<AudiencePerson>> {
    const idCheck = requireEndatixId(formId, "formId");
    if (!idCheck.success) return idCheck;

    return mapPersonResult(
      await this.endatix.post<WirePerson>(
        formAudiencePath(formId, "people"),
        body,
      ),
    );
  }

  async updatePerson(
    formId: string,
    membershipId: string,
    body: UpdateAudiencePersonRequest,
  ): Promise<ApiResult<AudiencePerson>> {
    const idsCheck = requireFormAndEntityIds(
      formId,
      membershipId,
      "membershipId",
    );
    if (!idsCheck.success) return idsCheck;

    return mapPersonResult(
      await this.endatix.put<WirePerson>(
        formAudiencePath(formId, "people", membershipId),
        body,
      ),
    );
  }

  async deletePerson(
    formId: string,
    membershipId: string,
  ): Promise<ApiResult<void>> {
    const idsCheck = requireFormAndEntityIds(
      formId,
      membershipId,
      "membershipId",
    );
    if (!idsCheck.success) {
      return idsCheck;
    }

    return this.endatix.delete(
      formAudiencePath(formId, "people", membershipId),
    );
  }

  /**
   * The one-request import of a whole CSV, up to the inline limit. The Hub imports through
   * `startImport`; e2e seeding still uses this one.
   */
  async importCsv(
    formId: string,
    body: ImportAudienceCsvRequest,
  ): Promise<ApiResult<AudienceImportResult>> {
    const idCheck = requireEndatixId(formId, "formId");
    if (!idCheck.success) return idCheck;

    return mapImportResult(
      await this.endatix.post<WireImport>(
        formAudiencePath(formId, "import"),
        body,
      ),
    );
  }

  /** The staged import (`./staged-imports`): start, chunks, reads, rejected rows and moves. */
  startImport(formId: string, body: StartAudienceImportRequest) {
    return this.imports.startImport(formId, body);
  }

  sendImportChunk(formId: string, importId: string, chunk: IndexedImportChunk) {
    return this.imports.sendImportChunk(formId, importId, chunk);
  }

  getImport(formId: string, importId: string) {
    return this.imports.getImport(formId, importId);
  }

  listImportRejections(formId: string, importId: string, page: number) {
    return this.imports.listImportRejections(formId, importId, page);
  }

  moveImport(formId: string, importId: string, status: AudienceImportMove) {
    return this.imports.moveImport(formId, importId, status);
  }

  async generateLinks(
    formId: string,
  ): Promise<ApiResult<IssuedAudienceLink[]>> {
    const idCheck = requireEndatixId(formId, "formId");
    if (!idCheck.success) return idCheck;

    const response = await this.endatix.post<WireIssuedLink[]>(
      formAudiencePath(formId, "links"),
      {},
    );
    if (!response.success) return response;
    return ApiResult.success(response.data.map((link) => mapIssuedLink(link)));
  }

  /** How many real participants a search keeps, and how many of them a batch would send a link. */
  async previewLinks(
    formId: string,
    search: string,
  ): Promise<ApiResult<AudienceLinksPreview>> {
    const idCheck = requireEndatixId(formId, "formId");
    if (!idCheck.success) return idCheck;

    return mapLinksPreviewResult(
      await this.endatix.get<WireLinksPreview>(
        buildLinksPreviewEndpoint(formId, search),
      ),
    );
  }

  /** New links for the participants a search keeps who have none; each token is in this response only. */
  async issueLinkBatch(
    formId: string,
    search: string,
  ): Promise<ApiResult<AudienceLinkBatch>> {
    const idCheck = requireEndatixId(formId, "formId");
    if (!idCheck.success) return idCheck;

    const response = await this.endatix.post<WireLinkBatch>(
      formAudiencePath(formId, "links", "batches"),
      linkBatchBody(search),
    );
    if (!response.success) return response;
    return ApiResult.success(mapLinkBatch(response.data));
  }

  async redeemLink(
    formId: string,
    token: string,
  ): Promise<ApiResult<RedeemedAudienceLink>> {
    const idCheck = requireEndatixId(formId, "formId");
    if (!idCheck.success) return idCheck;

    return mapRedeemedLinkResult(
      await this.endatix.post<WireRedeemedLink>(
        formAudiencePath(formId, "links", encodeURIComponent(token), "redeem"),
        {},
        { requireAuth: false },
      ),
    );
  }

  /**
   * A new token for one participant's link; the old one stops opening it. The raw token is in
   * this response only.
   */
  async reissueLink(
    formId: string,
    membershipId: string,
  ): Promise<ApiResult<IssuedAudienceLink>> {
    const idsCheck = requireFormAndEntityIds(
      formId,
      membershipId,
      "membershipId",
    );
    if (!idsCheck.success) return idsCheck;

    const response = await this.endatix.post<WireIssuedLink>(
      formAudiencePath(formId, `people/${membershipId}/link/reissue`),
      {},
    );
    if (!response.success) return response;
    return ApiResult.success(mapIssuedLink(response.data));
  }

  /** Test as this participant: a new test submission on the current definition and their current values. */
  async openTestSubmission(
    formId: string,
    membershipId: string,
  ): Promise<ApiResult<OpenedTestSubmission>> {
    const idsCheck = requireFormAndEntityIds(
      formId,
      membershipId,
      "membershipId",
    );
    if (!idsCheck.success) return idsCheck;

    return mapTestSubmissionResult(
      await this.endatix.post<WireTestSubmission>(
        formAudiencePath(formId, "test-submissions"),
        { membershipId },
      ),
    );
  }

  /**
   * Start over: deletes the test submission and opens a new one for the same person. `token` is
   * the one the test submission was opened with; the API refuses any other.
   */
  async restartTestSubmission(
    formId: string,
    submissionId: string,
    token: string,
  ): Promise<ApiResult<OpenedTestSubmission>> {
    const idsCheck = requireFormAndEntityIds(
      formId,
      submissionId,
      "submissionId",
    );
    if (!idsCheck.success) return idsCheck;

    return mapTestSubmissionResult(
      await this.endatix.post<WireTestSubmission>(
        formAudiencePath(formId, "test-submissions", submissionId, "restart"),
        { token },
      ),
    );
  }
}
