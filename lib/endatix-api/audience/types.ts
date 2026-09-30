import type { IPagedRequest } from "../shared/types";

/** Wire codes matching OSS `AudienceDataTypeCodes`. */
export type AudienceDataType =
  | "text"
  | "number"
  | "boolean"
  | "date"
  | "date_time"
  | "single_choice"
  | "multiple_choice";

export type AudienceIdentifierKind = "email" | "external_id";

export type AudienceSettings = {
  identifierKind: AudienceIdentifierKind;
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

export type UpdateAudienceSettingsRequest = {
  identifierKind: AudienceIdentifierKind;
};

export type ListAudiencePeopleRequest = IPagedRequest;
