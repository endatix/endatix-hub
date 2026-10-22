"use client";

import { useEffect, useMemo } from "react";
import { reviewAudience } from "@/lib/personalization/authoring";
import { LinkTabs } from "@/components/common/link-tabs";
import { rememberTableReturnTo } from "@/lib/list-page/table-return-to";
import {
  AUDIENCE_TABLE_KEY,
  parseAudienceReturnQuery,
} from "../audience-return-to";
import type { AudiencePageData, AudienceReviewData } from "../index";
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
  /** The saved form and its variables; `null` leaves the coverage out. */
  reviewData: AudienceReviewData | null;
};

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
  const { identifierKind } = settings;
  const { reviewData } = props;
  const review = useMemo(
    () =>
      reviewData && reviewAudience(reviewData.surveyJson, reviewData.variables),
    [reviewData],
  );
  const section = {
    formId: props.formId,
    viewSwitch,
    identifierKind,
    review,
    ...lists,
  };
  if (props.view === AudienceView.Properties)
    return <PropertiesSection {...section} />;
  const note = settings.isLocked ? (
    <MatchKeySummary identifierKind={identifierKind} />
  ) : null;
  return <PeopleSection {...section} matchKeyNote={note} />;
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
