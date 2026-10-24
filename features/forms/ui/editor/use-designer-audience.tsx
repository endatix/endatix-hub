"use client";

import { type ReactNode, useMemo, useState } from "react";
import type { SurveyCreatorModel } from "survey-creator-core";
import {
  bindAudienceToCreator,
  type CreatorBinding,
  type DesignerAudience,
  type FindParticipant,
} from "@/lib/personalization/authoring";
import {
  FindParticipantDialog,
  type FindParticipantRequest,
} from "./find-participant-dialog";

type Bind = (creator: SurveyCreatorModel) => CreatorBinding | undefined;

/**
 * The designer's Audience: how to bind Preview as to a new Creator (nothing without variables),
 * and the Find participant dialog it opens from the Preview tab.
 */
export function useDesignerAudience(
  audience: DesignerAudience | null | undefined,
): [bind: Bind, dialog: ReactNode] {
  const [request, setRequest] = useState<FindParticipantRequest | null>(null);
  const bind = useMemo(
    () => binder(audience, (previewAs) => setRequest({ previewAs })),
    [audience],
  );
  const close = () => setRequest(null);
  const dialog = audience && (
    <FindParticipantDialog
      finder={audience.participants}
      request={request}
      onClose={close}
    />
  );
  return [bind, dialog];
}

function binder(
  audience: DesignerAudience | null | undefined,
  onFindParticipant: FindParticipant,
): Bind {
  return (creator) =>
    audience
      ? bindAudienceToCreator(creator, audience, onFindParticipant)
      : undefined;
}
