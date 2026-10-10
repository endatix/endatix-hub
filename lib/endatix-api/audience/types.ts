import type { IPagedRequest } from "../shared/types";

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

export type AudiencePerson = {
  membershipId: string;
  audienceMemberId: string;
  identifier: string;
  values: AudiencePropertyValues;
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
};

export type UpdateAudienceSettingsRequest = {
  identifierKind: AudienceIdentifierKind;
};

export type ListAudiencePeopleRequest = IPagedRequest;
