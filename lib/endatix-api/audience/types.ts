import type { IPagedRequest } from "../shared/types";
import type { PersonalizationSource } from "../submissions/types";

/** Wire codes matching OSS `AudienceDataTypeCodes`. */
export const AudienceDataType = Object.freeze({
  Text: "text",
  Number: "number",
  Boolean: "boolean",
  Date: "date",
  DateTime: "date_time",
  SingleChoice: "single_choice",
  MultipleChoice: "multiple_choice",
} as const);

export type AudienceDataType =
  (typeof AudienceDataType)[keyof typeof AudienceDataType];

/** Wire codes matching OSS `AudienceIdentifierKindCodes`. */
export const AudienceIdentifierKind = Object.freeze({
  Email: "email",
  ExternalId: "external_id",
} as const);

export type AudienceIdentifierKind =
  (typeof AudienceIdentifierKind)[keyof typeof AudienceIdentifierKind];

export function isAudienceIdentifierKind(
  value: string,
): value is AudienceIdentifierKind {
  return (Object.values(AudienceIdentifierKind) as string[]).includes(value);
}

/** Paging limits matching OSS `AudiencePaging`. */
export const AudiencePaging = Object.freeze({
  DefaultPageSize: 50,
  MaxPageSize: 5_000,
} as const);

export type AudienceSettings = {
  identifierKind: AudienceIdentifierKind;
  /** True while any person is on any form's audience in the tenant. */
  isLocked: boolean;
};

export type AudienceProperty = {
  id: string;
  formId: string;
  variableName: string;
  name: string;
  dataType: AudienceDataType;
  sortOrder: number;
  dataListId?: string | null;
  choicesJson?: string | null;
  allowsOther: boolean;
};

/** Property values keyed by property id (JSON object keys are strings). */
export type AudiencePropertyValues = Record<string, string>;

/** Wire codes matching OSS `AudienceLinkStatusResponse.Status`. */
export const AudienceLinkStatusKind = Object.freeze({
  None: "none",
  Issued: "issued",
  Opened: "opened",
} as const);

export type AudienceLinkStatusKind =
  (typeof AudienceLinkStatusKind)[keyof typeof AudienceLinkStatusKind];

/**
 * Whether the person's personalized link was issued and opened. A test person is always `none`.
 * An opened link has no `submissionId` once its submission was deleted.
 */
export type AudienceLinkStatus =
  | { status: typeof AudienceLinkStatusKind.None }
  | { status: typeof AudienceLinkStatusKind.Issued }
  | {
      status: typeof AudienceLinkStatusKind.Opened;
      openedAt: string;
      submissionId?: string;
    };

export type AudiencePerson = {
  membershipId: string;
  audienceMemberId: string;
  identifier: string;
  values: AudiencePropertyValues;
  /** A test person: set when added, never changed, never sent a personalized link. */
  isTest: boolean;
  link: AudienceLinkStatus;
};

/** One of a participant's submissions on the form, newest first on `AudienceParticipant`. */
export type ParticipantSubmission = {
  id: string;
  createdAt: string;
  completedAt: string | null;
  isComplete: boolean;
  isTest: boolean;
  /** Who froze its values; null when the submission has no Snapshot. */
  snapshotSource: PersonalizationSource | null;
};

/** One participant on a form, with the newest 50 of their submissions and how many they have. */
export type AudienceParticipant = AudiencePerson & {
  submissions: ParticipantSubmission[];
  submissionTotal: number;
};

export type CreateAudiencePropertyRequest = {
  name: string;
  dataType: AudienceDataType;
  choicesJson?: string | null;
  allowsOther?: boolean;
};

export type UpdateAudiencePropertyRequest = {
  name?: string;
  sortOrder?: number;
};

export type CreateAudiencePersonRequest = {
  identifier: string;
  values?: AudiencePropertyValues;
  isTest?: boolean;
};

export type UpdateAudiencePersonRequest = {
  values: AudiencePropertyValues;
};

export type AudienceImportRejection = {
  rowNumber: number;
  reason: string;
};

export type AudienceImportResult = {
  importId: string;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  rejectedCount: number;
  rejections: AudienceImportRejection[];
};

export type ImportAudienceCsvRequest = {
  csvText: string;
  identifierColumn: string;
  fileName: string;
  propertyColumns?: Record<string, string>;
  /** People new to the form become test people; people already on it are skipped. */
  isTest?: boolean;
};

export type IssuedAudienceLink = {
  membershipId: string;
  token: string;
};

/** Redeem's answer. The deprecated `accessToken` (an opaque SubmissionToken) is not read. */
export type RedeemedAudienceLink = {
  submissionId: string;
  created: boolean;
  /** Signed submission access token with `submit`, sent as `tokenType=AccessToken`. */
  submissionAccessToken: string;
  submissionAccessTokenExpiresAt: string | null;
};

export type UpdateAudienceSettingsRequest = {
  identifierKind: AudienceIdentifierKind;
};

/** Wire values of the people list's `test` query (exact lowercase); `all` is the default. */
export const AudiencePeopleTestFilter = Object.freeze({
  All: "all",
  Real: "real",
  Test: "test",
} as const);

export type AudiencePeopleTestFilter =
  (typeof AudiencePeopleTestFilter)[keyof typeof AudiencePeopleTestFilter];

export function isAudiencePeopleTestFilter(
  value: string,
): value is AudiencePeopleTestFilter {
  return (Object.values(AudiencePeopleTestFilter) as string[]).includes(value);
}

/** The people list's longest `search`, matching OSS (as long as an identifier can be). */
export const MAX_AUDIENCE_SEARCH_LENGTH = 256;

export type ListAudiencePeopleRequest = IPagedRequest & {
  test?: AudiencePeopleTestFilter;
  /** Part of an identifier, matched ignoring case; blank is no search. */
  search?: string;
};

/** A new test submission and the token the respondent page opens it with. */
export type OpenedTestSubmission = {
  submissionId: string;
  token: string;
};

/** One participant's values, named by their identifier. */
export type AudienceVariablePreset = {
  name: string;
  /** Variable name → value, typed as the respondent's `personalization`. */
  variables: Record<string, unknown>;
};

/** The form's Variables in SurveyJS's variable presets shape, without importing survey-core. */
export type AudienceVariablePresets = {
  /** Survey JSON whose top-level questions are the variables, one per Property. */
  definition: Record<string, unknown>;
  /** Up to 20 participants: Test participants first, then real ones, each group by identifier. */
  presets: AudienceVariablePreset[];
  /** Every participant on the form, test and real; more than `presets` holds past 20. */
  totalPresets: number;
};

export type AudienceVariableCoverage = {
  participants: { test: number; real: number };
  properties: {
    variableName: string;
    filledTest: number;
    filledReal: number;
  }[];
};

/** What the designer's Test participant values editor may change. */
export type AudiencePresetEditing = {
  allowAdd: boolean;
  allowEdit: boolean;
  allowDelete: boolean;
};

export type AudienceVariables = {
  /** `null` when the form has no Properties. */
  variablePresets: AudienceVariablePresets | null;
  coverage: AudienceVariableCoverage;
  editing: AudiencePresetEditing;
  /** The real participants among `presets`, by name: preview-only, never saved. */
  readOnlyPresets: string[];
};
