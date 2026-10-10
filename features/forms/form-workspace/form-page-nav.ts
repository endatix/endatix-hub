import type { Route } from "next";
import type { NavSwitcherModel } from "@/components/layout-ui/navigation/nav-switcher";
import type { FormsBreadcrumbItem } from "@/features/folders";
import {
  getFormWorkspaceSectionLabel,
  getFormWorkspaceSections,
  type FormWorkspaceFlags,
  type FormWorkspaceSectionId,
} from "./form-workspace-sections";

export type FormPageBreadcrumbInput = {
  formId: string;
  formName: string;
  folder?: { name: string; slug: string };
  flags: FormWorkspaceFlags;
  /** The page being viewed; without one the trail ends at the form. */
  active?: FormWorkspaceSectionId;
};

function formTrail(input: FormPageBreadcrumbInput): FormsBreadcrumbItem[] {
  const { formId, formName, folder } = input;
  const forms: FormsBreadcrumbItem = {
    type: "link",
    label: "Forms",
    href: "/forms" as Route,
  };
  // On one of the form's pages the form is where the reader is, so it is the current crumb
  // and the Overview is reached through the switcher, not a second link to the same page.
  const form: FormsBreadcrumbItem = input.active
    ? { type: "page", label: formName }
    : { type: "link", label: formName, href: `/forms/${formId}` as Route };
  if (!folder) return [forms, form];
  const href = `/forms/folders/${encodeURIComponent(folder.slug)}` as Route;
  return [forms, { type: "link", label: folder.name, href }, form];
}

function pageSwitcher(
  input: FormPageBreadcrumbInput,
  active: FormWorkspaceSectionId,
): NavSwitcherModel {
  const options = getFormWorkspaceSections(input.formId, input.flags).map(
    (section) => ({
      label: section.label,
      href: section.href,
      icon: section.icon,
      isActive: section.id === active,
    }),
  );
  const label = getFormWorkspaceSectionLabel(active);
  const icon = options.find((option) => option.isActive)?.icon;
  return { label, icon, options };
}

export type FormPageNav = {
  trail: FormsBreadcrumbItem[];
  /** Which aspect of the form is shown; after the trail, past a divider. */
  switcher?: NavSwitcherModel;
};

/**
 * `Forms › folder › form │ page ▾`. The trail says where the reader is and ends at the form; the
 * switcher picks which aspect of it they see (Overview, Submissions, Audience, …). The page is
 * not a child of the form, so it is not a crumb.
 */
export function buildFormPageNav(input: FormPageBreadcrumbInput): FormPageNav {
  const trail = formTrail(input);
  if (!input.active) return { trail };
  return { trail, switcher: pageSwitcher(input, input.active) };
}
