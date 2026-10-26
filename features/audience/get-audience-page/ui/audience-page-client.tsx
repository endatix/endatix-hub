"use client";

import { useEffect, useMemo, type ComponentProps } from "react";
import {
  usageVerdicts,
  type AudienceUsage,
} from "@/lib/personalization/coverage/audience-usage";
import { LinkTabs } from "@/components/common/link-tabs";
import { rememberTableReturnTo } from "@/lib/list-page/table-return-to";
import {
  AUDIENCE_TABLE_KEY,
  parseAudienceReturnQuery,
} from "../audience-return-to";
import type { AudiencePageData } from "../index";
import { AudienceView, audienceViewTabs } from "../audience-view";
import { MatchKeyCard } from "../../update-settings/ui/match-key-card";
import { MatchKeySummary } from "../../update-settings/ui/match-key-summary";
import { PeopleSection } from "./people-section";
import { PropertiesSection } from "./properties-section";

type Props = {
  formId: string;
  view: AudienceView;
  data: AudiencePageData;
  /** The list URL's query, already whitelisted, so Back can restore it. */
  listSearch: string;
  /** What the saved form reads of its variables; `null` leaves the coverage out. */
  usage: AudienceUsage | null;
};

/** The match key is a setup step while it can change; once locked, People states it. */
function MatchKeySetup({ data }: Readonly<Pick<Props, "data">>) {
  const { settings, canManageMatchKey } = data;
  if (settings.isLocked) return null;
  return <MatchKeyCard {...settings} canManage={canManageMatchKey} />;
}

function ViewSwitch({ formId, view, data }: Readonly<Props>) {
  const tabs = audienceViewTabs(
    formId,
    { people: data.totalPeople, properties: data.properties.length },
    { previewAs: data.canEdit },
  );
  return <LinkTabs label="Participants view" tabs={tabs} activeId={view} />;
}

/** The designer's verdicts on the saved form. */
function useVerdicts(usage: AudienceUsage | null) {
  return useMemo(() => usage && usageVerdicts(usage), [usage]);
}

type PeopleViewProps = Omit<
  ComponentProps<typeof PeopleSection>,
  "importLimits" | "matchKeyNote"
> & { settings: AudiencePageData["settings"] };

/** The locked match key is said once where participants are listed; the import limits go to Import CSV. */
function PeopleView({ settings, ...section }: Readonly<PeopleViewProps>) {
  const note = settings.isLocked ? (
    <MatchKeySummary identifierKind={settings.identifierKind} />
  ) : null;
  return (
    <PeopleSection
      {...section}
      importLimits={settings.importLimits}
      matchKeyNote={note}
    />
  );
}

/**
 * People is the tab's task and opens first; Properties is a second view of the same tab
 * (the columns people have), switched with link tabs so each view has its own URL.
 */
function ActiveView(props: Readonly<Props>) {
  const { settings, canManageMatchKey: _, ...lists } = props.data;
  const viewSwitch = <ViewSwitch {...props} />;
  const { identifierKind } = settings;
  const verdicts = useVerdicts(props.usage);
  const section = {
    formId: props.formId,
    viewSwitch,
    identifierKind,
    verdicts,
    ...lists,
  };
  if (props.view === AudienceView.Properties)
    return <PropertiesSection {...section} />;
  return <PeopleView {...section} settings={settings} />;
}

export function AudiencePageClient(props: Readonly<Props>) {
  const { formId, listSearch } = props;
  useEffect(() => {
    rememberTableReturnTo(
      AUDIENCE_TABLE_KEY,
      listSearch,
      parseAudienceReturnQuery,
      formId,
    );
  }, [formId, listSearch]);

  return (
    <div className="flex flex-col gap-8">
      <MatchKeySetup data={props.data} />
      <ActiveView {...props} />
    </div>
  );
}
