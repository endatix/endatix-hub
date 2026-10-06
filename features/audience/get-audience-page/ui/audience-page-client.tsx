"use client";

import type { AudiencePageData } from "../index";
import { MatchKeyCard } from "../../update-settings/ui/match-key-card";
import { PeopleSection } from "./people-section";
import { PropertiesSection } from "./properties-section";

type Props = { formId: string; data: AudiencePageData };

/**
 * Setup order, top to bottom: the match key (chosen once, before anyone is added), the people
 * this form is for, then the properties that become their columns.
 */
export function AudiencePageClient({ formId, data }: Readonly<Props>) {
  const { settings, canManageMatchKey, ...lists } = data;
  return (
    <div className="flex flex-col gap-10">
      <MatchKeyCard
        formId={formId}
        {...settings}
        canManage={canManageMatchKey}
      />
      <PeopleSection
        formId={formId}
        identifierKind={settings.identifierKind}
        {...lists}
      />
      <PropertiesSection formId={formId} {...lists} />
    </div>
  );
}
