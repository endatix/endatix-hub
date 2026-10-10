import type { Route } from "next";
import type { NavIconName } from "@/components/layout-ui/navigation/nav-icons";

/** The form's pages. Design is not one: it is an immersive editor entered from them. */
export type FormWorkspaceSectionId =
  | "overview"
  | "submissions"
  | "audience"
  | "analytics"
  | "settings";

/** Which optional sections the tenant has; the others are always shown. */
export type FormWorkspaceFlags = {
  analytics: boolean;
  audience: boolean;
};

export type FormWorkspaceSection = {
  id: FormWorkspaceSectionId;
  label: string;
  href: Route;
  icon: NavIconName;
};

export const NO_OPTIONAL_SECTIONS: FormWorkspaceFlags = Object.freeze({
  analytics: false,
  audience: false,
});

const SECTIONS: ReadonlyArray<{
  id: FormWorkspaceSectionId;
  label: string;
  path: string;
  icon: NavIconName;
  flag?: keyof FormWorkspaceFlags;
}> = Object.freeze([
  { id: "overview", label: "Overview", path: "", icon: "layout-dashboard" },
  {
    id: "submissions",
    label: "Submissions",
    path: "/submissions",
    icon: "list",
  },
  {
    id: "audience",
    label: "Audience",
    path: "/audience",
    icon: "users",
    flag: "audience",
  },
  {
    id: "analytics",
    label: "Analytics",
    path: "/analytics",
    icon: "bar-chart",
    flag: "analytics",
  },
  { id: "settings", label: "Settings", path: "/settings", icon: "settings" },
]);

const RETURN_QUERY_KEY = "from";

function sectionHref(formId: string, path: string): Route {
  return `/forms/${formId}${path}` as Route;
}

/** The form's pages in workspace order, without the ones the tenant does not have. */
export function getFormWorkspaceSections(
  formId: string,
  flags: FormWorkspaceFlags,
): FormWorkspaceSection[] {
  return SECTIONS.filter((section) => !section.flag || flags[section.flag]).map(
    ({ id, label, path, icon }) => ({
      id,
      label,
      icon,
      href: sectionHref(formId, path),
    }),
  );
}

/** The section a path belongs to; `undefined` outside the form's pages (designer, forms list). */
export function getActiveFormWorkspaceSection(
  pathname: string,
  formId: string,
): FormWorkspaceSectionId | undefined {
  const base = `/forms/${formId}`;
  if (pathname === base || pathname === `${base}/`) return "overview";
  if (!pathname.startsWith(`${base}/`)) return undefined;
  const segment = pathname.slice(base.length + 1).split("/")[0];
  return SECTIONS.find((section) => section.path === `/${segment}`)?.id;
}

/** Opens the designer, remembering the page to return to when it closes. */
export function getFormDesignHref(
  formId: string,
  from?: FormWorkspaceSectionId,
): Route {
  const query =
    from && from !== "overview" ? `?${RETURN_QUERY_KEY}=${from}` : "";
  return `/forms/${formId}/design${query}` as Route;
}

export type FormDesignReturn = { href: Route; label: string };

/**
 * Where the designer's Back goes. `from` is untrusted URL input, so only a known section id is
 * honoured; anything else returns to the overview. It is never used as a path.
 */
export function getFormDesignReturn(
  formId: string,
  from: string | undefined,
): FormDesignReturn {
  const section = SECTIONS.find((entry) => entry.id === from) ?? SECTIONS[0];
  return { href: sectionHref(formId, section.path), label: section.label };
}

/** The page's name, for its title and the header switcher. */
export function getFormWorkspaceSectionLabel(
  id: FormWorkspaceSectionId,
): string {
  return SECTIONS.find((section) => section.id === id)?.label ?? id;
}

/** Pages whose own task has the primary button (Audience: Add person). */
const PAGES_WITH_OWN_PRIMARY: ReadonlySet<FormWorkspaceSectionId> = new Set([
  "audience",
]);

/**
 * Design is the record's main action, so it is primary in the header unless the page already
 * has a primary action of its own (one primary per page, DESIGN.md §5 Buttons).
 */
export function isFormDesignPrimary(active?: FormWorkspaceSectionId): boolean {
  return !active || !PAGES_WITH_OWN_PRIMARY.has(active);
}
