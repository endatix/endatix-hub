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
const PREVIEW_AS_TAB_ID = "preview-as";

type ViewOptions = {
  /** Whether this reader may preview the form as a participant (`forms.edit`). */
  previewAs?: boolean;
};

/** Preview as follows, for a reader who may use it, once the form has Properties. */
function previewAsTabs(formId: string, show: boolean): LinkTab[] {
  if (!show) return [];
  const href = formRoutes.previewAs(formId);
  return [{ id: PREVIEW_AS_TAB_ID, label: "Preview as", href }];
}

/** People is the bare tab URL; Properties is a view of it, so the tab link stays canonical. */
function listTabs(formId: string, counts: ViewCounts): LinkTab[] {
  return [
    {
      id: AudienceView.People,
      label: "People",
      href: formRoutes.audience(formId),
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
  ];
}

export function audienceViewTabs(
  formId: string,
  counts: ViewCounts,
  { previewAs = false }: ViewOptions = {},
): LinkTab[] {
  const preview = previewAsTabs(formId, previewAs && counts.properties > 0);
  return [...listTabs(formId, counts), ...preview];
}
