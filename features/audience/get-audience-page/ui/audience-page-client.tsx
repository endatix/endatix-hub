"use client";

import { LinkTabs } from "@/components/common/link-tabs";
import type { AudiencePageData } from "../index";
import { AudienceView, audienceViewTabs } from "../audience-view";
import { MatchKeyCard } from "../../update-settings/ui/match-key-card";
import { MatchKeySummary } from "../../update-settings/ui/match-key-summary";
import { PeopleSection } from "./people-section";
import { PropertiesSection } from "./properties-section";

type Props = { formId: string; view: AudienceView; data: AudiencePageData };

/** The match key is a setup step while it can change; once locked, People states it. */
function MatchKeySetup({ data }: Readonly<Pick<Props, "data">>) {
  const { settings, canManageMatchKey } = data;
  if (settings.isLocked) return null;
  return <MatchKeyCard {...settings} canManage={canManageMatchKey} />;
}

function ViewSwitch({ formId, view, data }: Readonly<Props>) {
  const tabs = audienceViewTabs(formId, {
    people: data.totalPeople,
    properties: data.properties.length,
  });
  return <LinkTabs label="Audience view" tabs={tabs} activeId={view} />;
}

/**
 * People is the tab's task and opens first; Properties is a second view of the same tab
 * (the columns people have), switched with link tabs so each view has its own URL.
 */
function ActiveView(props: Readonly<Props>) {
  const { settings, canManageMatchKey: _, ...lists } = props.data;
  const viewSwitch = <ViewSwitch {...props} />;
  const section = { formId: props.formId, viewSwitch, ...lists };
  if (props.view === AudienceView.Properties)
    return <PropertiesSection {...section} />;
  const note = settings.isLocked ? (
    <MatchKeySummary identifierKind={settings.identifierKind} />
  ) : null;
  return (
    <PeopleSection
      {...section}
      identifierKind={settings.identifierKind}
      matchKeyNote={note}
    />
  );
}

export function AudiencePageClient(props: Readonly<Props>) {
  return (
    <div className="flex flex-col gap-8">
      <MatchKeySetup data={props.data} />
      <ActiveView {...props} />
    </div>
  );
}
