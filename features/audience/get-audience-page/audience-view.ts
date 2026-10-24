import type { LinkTab } from "@/components/common/link-tabs";
import { formRoutes } from "@/lib/routes/form-routes";

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

/** Its own page (it needs `forms.edit`), switched to from the same tabs. */
export const PREVIEW_AS_TAB_ID = "preview-as";

type ViewOptions = {
  /** Whether this reader may preview the form as a participant (`forms.edit`). */
  previewAs?: boolean;
};

function previewAsTab(formId: string): LinkTab {
  return {
    id: PREVIEW_AS_TAB_ID,
    label: "Preview as",
    href: formRoutes.previewAs(formId),
  };
}

/**
 * People is the bare tab URL; Properties is a view of it, so the tab link stays canonical.
 * Preview as follows, once the form has Properties to preview with.
 */
export function audienceViewTabs(
  formId: string,
  counts: ViewCounts,
  { previewAs = false }: ViewOptions = {},
): LinkTab[] {
  const base = formRoutes.audience(formId);
  const preview =
    previewAs && counts.properties > 0 ? [previewAsTab(formId)] : [];
  return [
    {
      id: AudienceView.People,
      label: "People",
      href: base,
      count: counts.people,
    },
    {
      id: AudienceView.Properties,
      label: "Properties",
      href: formRoutes.audience(formId, {
        search: `view=${AudienceView.Properties}`,
      }),
      count: counts.properties,
    },
    ...preview,
  ];
}
