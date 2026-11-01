"use server";

import { Permissions } from "@/features/auth/authorization";
import type { AudienceVariablePreset } from "@/lib/endatix-api/audience/types";
import type {
  FindParticipantsRequest,
  FoundParticipants,
} from "@/lib/personalization/authoring";
import { Result } from "@/lib/result";
import { withHubAudienceApi } from "../shared/with-hub-audience-api.server";
import { findParticipants, parseFindRequest } from "./find-participants.server";

// Both run inside the designer: a redirect would throw away the author's unsaved edits.

/** A page of the designer's Find participant, Test participants first. */
export async function findParticipantsAction(
  formId: string,
  request: FindParticipantsRequest,
): Promise<Result<FoundParticipants>> {
  const parsed = parseFindRequest(request);
  if (!parsed) return Result.validationError("Invalid participant search.");
  return withHubAudienceApi((api) => findParticipants(api, formId, parsed), {
    permission: Permissions.Forms.Edit,
    background: true,
    fallbackMessage: "Failed to find participants.",
    logMessage: "Failed to find participants for Preview as.",
    loggerName: "audience.variables.find",
  });
}

/** The values of the participant picked in Find participant. */
export async function getParticipantPresetAction(
  formId: string,
  audienceMemberId: string,
): Promise<Result<AudienceVariablePreset>> {
  return withHubAudienceApi(
    (api) => api.audience.getParticipantVariables(formId, audienceMemberId),
    {
      permission: Permissions.Forms.Edit,
      background: true,
      fallbackMessage: "Failed to load the participant's values.",
      logMessage: "Failed to load a participant's values for Preview as.",
      loggerName: "audience.variables.participant",
    },
  );
}
