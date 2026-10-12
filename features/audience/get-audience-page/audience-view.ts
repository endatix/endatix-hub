import type { Route } from "next";
import type { LinkTab } from "@/components/common/link-tabs";

export const AudienceView = Object.freeze({
  People: "people",
  Properties: "properties",
} as const);
export type AudienceView = (typeof AudienceView)[keyof typeof AudienceView];

/** `?view=` from the URL; anything unknown opens People, the tab's main task. */
export function parseAudienceView(value: string | undefined): AudienceView {
  return value === AudienceView.Properties
    ? AudienceView.Properties
    : AudienceView.People;
}

type ViewCounts = { people: number; properties: number };

/** People is the bare tab URL; Properties is a view of it, so the tab link stays canonical. */
export function audienceViewTabs(
  formId: string,
  counts: ViewCounts,
): LinkTab[] {
  const base = `/forms/${formId}/audience`;
  return [
    {
      id: AudienceView.People,
      label: "People",
      href: base as Route,
      count: counts.people,
    },
    {
      id: AudienceView.Properties,
      label: "Properties",
      href: `${base}?view=${AudienceView.Properties}` as Route,
      count: counts.properties,
    },
  ];
}
