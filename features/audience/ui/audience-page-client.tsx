"use client";

import type { AudiencePageData } from "../get-audience-page";
import { MatchKeySettings } from "./match-key-settings";
import { PeopleSection } from "./people-section";
import { PropertiesSection } from "./properties-section";

type Props = { formId: string; data: AudiencePageData };

export function AudiencePageClient({ formId, data }: Readonly<Props>) {
  return (
    <div className="space-y-10">
      <MatchKeySettings
        identifierKind={data.settings.identifierKind}
        isLocked={data.settings.isLocked}
        canManage={data.canManageMatchKey}
      />
      <PropertiesSection formId={formId} properties={data.properties} />
      <PeopleSection
        formId={formId}
        identifierKind={data.settings.identifierKind}
        properties={data.properties}
        people={data.people}
        totalPeople={data.totalPeople}
      />
    </div>
  );
}
