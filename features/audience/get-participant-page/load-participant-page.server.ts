import "server-only";

import type { EndatixApi } from "@/lib/endatix-api";
import type {
  AudienceIdentifierKind,
  AudienceParticipant,
  AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import {
  ApiErrorType,
  type ApiResult,
} from "@/lib/endatix-api/shared/api-result";
import { Result, toResult } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import type { MapApiResultToResultOptions } from "@/lib/result/map-api-result-to-result";
import { valueProperties } from "../utils";

export type ParticipantPageData = {
  participant: AudienceParticipant;
  identifierKind: AudienceIdentifierKind;
  /** Value properties only: the one named like the match key is the identifier. */
  properties: AudienceProperty[];
  /** Whether this reader may open a test submission as them (`forms.test`). */
  canTest: boolean;
};

/** `gone`: the participant is no longer on this form (the API answers 404). */
export type ParticipantPage =
  | { status: "found"; data: ParticipantPageData }
  | { status: "gone" };

export type ParticipantPageRequest = {
  api: EndatixApi;
  formId: string;
  memberId: string;
  canTest: boolean;
};

function unwrapPart<T>(apiResult: ApiResult<T>, label: string): Result<T> {
  return toResult(apiResult, {
    fallbackMessage: `Failed to load the participant's ${label}.`,
    logMessage: `Failed to load the participant's ${label}.`,
    loggerName: `audience.participant.${label}`,
  } as MapApiResultToResultOptions<T>);
}

const isGone = (participant: ApiResult<AudienceParticipant>) =>
  !participant.success && participant.error.type === ApiErrorType.NotFoundError;

function fetchParticipantParts({
  api,
  formId,
  memberId,
}: ParticipantPageRequest) {
  return Promise.all([
    api.audience.getParticipant(formId, memberId),
    api.audience.listProperties(formId),
    api.audience.getSettings(),
  ]);
}

/**
 * One participant's page: the participant, the form's properties and the match key, read in
 * parallel. The page has already checked Hub access, `forms.edit` and the flag. A member id that
 * cannot be one is a wrong link, shown like a removed participant.
 */
export async function loadParticipantPage(
  request: ParticipantPageRequest,
): Promise<Result<ParticipantPage>> {
  if (Result.isError(validateEndatixId(request.memberId, "memberId")))
    return Result.success({ status: "gone" });
  const [participantApi, propertiesApi, settingsApi] =
    await fetchParticipantParts(request);
  if (isGone(participantApi)) return Result.success({ status: "gone" });

  const participant = unwrapPart(participantApi, "details");
  if (Result.isError(participant)) return participant;
  const properties = unwrapPart(propertiesApi, "properties");
  if (Result.isError(properties)) return properties;
  const settings = unwrapPart(settingsApi, "settings");
  if (Result.isError(settings)) return settings;

  const { identifierKind } = settings.value;
  return Result.success({
    status: "found",
    data: {
      participant: participant.value,
      identifierKind,
      properties: valueProperties(properties.value, identifierKind),
      canTest: request.canTest,
    },
  });
}
