import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { ApiResult } from "../shared/api-result";
import {
  normalizePagedResponse,
  type NormalizedPagedResponse,
} from "../shared/paged-response";
import type { PagedResponse } from "../shared/types";
import {
  PersonalizationSource,
  type PersonalizationSource as PersonalizationSourceCode,
} from "../submissions/types";
import {
  AudienceLinkStatusKind,
  type AudienceParticipant,
  type ParticipantSubmission,
  type AudienceLinkStatus,
  type RedeemedAudienceLink,
  type AudienceImportResult,
  type AudiencePerson,
  type AudienceProperty,
  type OpenedTestSubmission,
} from "./types";

export type WireProperty = Omit<
  AudienceProperty,
  "id" | "formId" | "dataListId"
> & {
  id: string | number;
  formId: string | number;
  dataListId?: string | number | null;
};

export type WireLinkStatus = {
  status: string;
  openedAt?: string | null;
  submissionId?: string | number | null;
};

export type WirePerson = {
  membershipId: string | number;
  audienceMemberId: string | number;
  identifier: string;
  values: Record<string, string>;
  isTest?: boolean;
  /** Missing from an API older than link status; read as `none`. */
  link?: WireLinkStatus | null;
};

export function mapProperty(wire: WireProperty): AudienceProperty {
  return {
    id: String(wire.id),
    formId: String(wire.formId),
    variableName: wire.variableName,
    name: wire.name,
    dataType: wire.dataType,
    sortOrder: wire.sortOrder,
    dataListId:
      wire.dataListId === null || wire.dataListId === undefined
        ? wire.dataListId
        : String(wire.dataListId),
    choicesJson: wire.choicesJson,
    allowsOther: wire.allowsOther,
  };
}

export function mapPerson(wire: WirePerson): AudiencePerson {
  return {
    membershipId: String(wire.membershipId),
    audienceMemberId: String(wire.audienceMemberId),
    identifier: wire.identifier,
    values: wire.values ?? {},
    isTest: wire.isTest ?? false,
    link: mapLinkStatus(wire.link),
  };
}

/** An unknown status reads as `none`, so the list never claims a link it cannot name. */
function mapLinkStatus(
  wire: WireLinkStatus | null | undefined,
): AudienceLinkStatus {
  switch (wire?.status) {
    case AudienceLinkStatusKind.Issued:
      return { status: AudienceLinkStatusKind.Issued };
    case AudienceLinkStatusKind.Opened:
      return openedLink(wire);
    default:
      return { status: AudienceLinkStatusKind.None };
  }
}

function openedLink(wire: WireLinkStatus): AudienceLinkStatus {
  const opened = {
    status: AudienceLinkStatusKind.Opened,
    openedAt: wire.openedAt ?? "",
  };
  return wire.submissionId == null
    ? opened
    : { ...opened, submissionId: String(wire.submissionId) };
}

export type WireParticipantSubmission = Omit<
  ParticipantSubmission,
  "id" | "snapshotSource"
> & {
  id: string | number;
  /** Left out when the submission has no Snapshot. */
  snapshotSource?: string | null;
};

export type WireParticipant = WirePerson & {
  submissions?: WireParticipantSubmission[];
  submissionTotal?: number;
};

const SNAPSHOT_SOURCES: readonly string[] = Object.values(
  PersonalizationSource,
);

/** An unknown source reads as none, so the page never names a source it cannot label. */
function mapSnapshotSource(
  wire: string | null | undefined,
): PersonalizationSourceCode | null {
  return wire && SNAPSHOT_SOURCES.includes(wire)
    ? (wire as PersonalizationSourceCode)
    : null;
}

function mapParticipantSubmission(
  wire: WireParticipantSubmission,
): ParticipantSubmission {
  return {
    id: String(wire.id),
    createdAt: wire.createdAt,
    completedAt: wire.completedAt ?? null,
    isComplete: wire.isComplete,
    isTest: wire.isTest,
    snapshotSource: mapSnapshotSource(wire.snapshotSource),
  };
}

export function mapParticipantResult(
  response: ApiResult<WireParticipant>,
): ApiResult<AudienceParticipant> {
  if (!response.success) return response;
  const { submissions = [], submissionTotal } = response.data;
  return ApiResult.success({
    ...mapPerson(response.data),
    submissions: submissions.map((submission) =>
      mapParticipantSubmission(submission),
    ),
    submissionTotal: submissionTotal ?? submissions.length,
  });
}

export function formAudiencePath(
  formId: string,
  ...segments: string[]
): string {
  const base = `/forms/${formId}/audience`;
  return segments.length === 0 ? base : `${base}/${segments.join("/")}`;
}

export function requireEndatixId(
  id: string,
  paramName: string,
): ApiResult<string> {
  const result = validateEndatixId(id, paramName);
  return Result.isError(result)
    ? ApiResult.validationError(result.message)
    : ApiResult.success(result.value);
}

export function requireFormAndEntityIds(
  formId: string,
  entityId: string,
  entityParam: string,
): ApiResult<void> {
  const formCheck = requireEndatixId(formId, "formId");
  if (!formCheck.success) {
    return formCheck;
  }

  const entityCheck = requireEndatixId(entityId, entityParam);
  if (!entityCheck.success) {
    return entityCheck;
  }

  return ApiResult.success(undefined);
}

export function mapPropertyResult(
  response: ApiResult<WireProperty>,
): ApiResult<AudienceProperty> {
  return response.success
    ? ApiResult.success(mapProperty(response.data))
    : response;
}

export function mapPersonResult(
  response: ApiResult<WirePerson>,
): ApiResult<AudiencePerson> {
  return response.success
    ? ApiResult.success(mapPerson(response.data))
    : response;
}

export type WireImport = Omit<AudienceImportResult, "importId"> & {
  importId: string | number;
};

export function mapImportResult(
  response: ApiResult<WireImport>,
): ApiResult<AudienceImportResult> {
  return response.success
    ? ApiResult.success({
        ...response.data,
        importId: String(response.data.importId),
      })
    : response;
}

export function mapPeoplePageResult(
  response: ApiResult<PagedResponse<WirePerson>>,
): ApiResult<NormalizedPagedResponse<AudiencePerson>> {
  if (!response.success) {
    return response;
  }

  return ApiResult.success(
    normalizePagedResponse({
      ...response.data,
      items: response.data.items.map((person) => mapPerson(person)),
    }),
  );
}

export type WireRedeemedLink = Omit<RedeemedAudienceLink, "submissionId"> & {
  submissionId: string | number;
};

export function mapRedeemedLinkResult(
  response: ApiResult<WireRedeemedLink>,
): ApiResult<RedeemedAudienceLink> {
  return response.success
    ? ApiResult.success({
        ...response.data,
        submissionId: String(response.data.submissionId),
      })
    : response;
}

export type WireTestSubmission = Omit<OpenedTestSubmission, "submissionId"> & {
  submissionId: string | number;
};

export function mapTestSubmissionResult(
  response: ApiResult<WireTestSubmission>,
): ApiResult<OpenedTestSubmission> {
  return response.success
    ? ApiResult.success({
        submissionId: String(response.data.submissionId),
        token: response.data.token,
      })
    : response;
}
