import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { NAV_ICONS } from "@/components/layout-ui/navigation/nav-icons";
import {
  getFormWorkspaceSections,
  type FormWorkspaceFlags,
  type FormWorkspaceSection,
} from "../form-workspace-sections";

type FormPageLinksProps = {
  formId: string;
  flags: FormWorkspaceFlags;
};

function PageLinkRow({ section }: Readonly<{ section: FormWorkspaceSection }>) {
  const Icon = NAV_ICONS[section.icon];
  return (
    <li>
      <Link
        href={section.href}
        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-background"
      >
        <Icon className="size-4 text-muted-foreground" />
        <span className="flex-1">{section.label}</span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>
    </li>
  );
}

/** The form's pages as a list, the same entries and icons as the header switcher. */
export function FormPageLinks({ formId, flags }: Readonly<FormPageLinksProps>) {
  return (
    <nav aria-label="Form pages">
      <ul className="flex flex-col rounded-lg bg-muted/40 p-1">
        {getFormWorkspaceSections(formId, flags).map((section) => (
          <PageLinkRow key={section.id} section={section} />
        ))}
      </ul>
    </nav>
  );
}
