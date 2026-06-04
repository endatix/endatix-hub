import { INavItem } from "@/types/navigation-models";
import {
  BookOpen,
  ClipboardList,
  DatabaseZap,
  FolderCog,
  LayoutTemplate,
  LifeBuoy,
  LineChart,
  Plug,
  Repeat,
  ShieldCheck,
  Settings2,
  UserCog,
  Users,
} from "lucide-react";

export const HOME_ROUTE_PATH = "/";

const sitemapArray: INavItem[] = [
  {
    key: "forms",
    title: "Forms",
    url: "/forms",
    icon: ClipboardList,
  },
  {
    key: "formTemplates",
    title: "Form Templates",
    url: "/forms/templates",
    icon: LayoutTemplate,
  },
  {
    key: "folders",
    title: "Folders",
    url: "/folders",
    icon: FolderCog,
  },
  {
    key: "dataLists",
    title: "Data Lists",
    url: "/data-lists",
    icon: DatabaseZap,
  },
  {
    key: "documentation",
    title: "Documentation",
    url: "https://docs.endatix.com",
    icon: BookOpen,
    external: true,
    children: [
      {
        key: "getting-started",
        title: "Getting started",
        url: "https://docs.endatix.com/docs/form-builder/?utm_source=endatix-hub&utm_medium=product",
        external: true,
      },
      {
        key: "question-loops",
        title: "Question loops",
        url: "https://docs.endatix.com/docs/end-users/forms/form-builder/question-loops/?utm_source=endatix-hub&utm_medium=product",
        external: true,
      },
      {
        key: "randomize-choices",
        title: "Randomize choices",
        url: "https://docs.endatix.com/docs/end-users/forms/form-builder/randomization-of-choices/?utm_source=endatix-hub&utm_medium=product",
        external: true,
      },
      {
        key: "translation",
        title: "Localize your forms",
        url: "https://docs.endatix.com/docs/end-users/forms/translation-and-localization/?utm_source=endatix-hub&utm_medium=product",
        external: true,
      },
    ],
  },
  {
    key: "analytics",
    title: "Analytics",
    url: "/",
    icon: LineChart,
  },
  {
    key: "workflows",
    title: "Workflows",
    url: "/",
    icon: Repeat,
  },
  {
    key: "integrations",
    title: "Integrations",
    url: "/",
    icon: Plug,
  },
  {
    key: "settings",
    title: "Settings",
    url: "/settings/organization/users",
    icon: Settings2,
    children: [
      {
        key: "organizationSection",
        title: "Organization",
        url: "",
        isSectionHeader: true,
      },
      {
        key: "organizationGeneral",
        title: "General",
        url: "/settings/organization/forms",
      },
      {
        key: "users",
        title: "Users",
        url: "/settings/organization/users",
        icon: Users,
      },
      {
        key: "roles",
        title: "Roles",
        url: "/settings/organization/roles",
        icon: UserCog,
      },
      {
        key: "myAccountSection",
        title: "My Account",
        url: "",
        isSectionHeader: true,
      },
      {
        key: "security",
        title: "Security",
        url: "/settings/security",
        icon: ShieldCheck,
      },
    ],
  },
  {
    key: "support",
    title: "Support",
    url: "https://github.com/endatix/endatix/issues",
    icon: LifeBuoy,
    external: true,
  },
];

type Sitemap = {
  [key: string]: INavItem;
};

export const sitemap: Sitemap = sitemapArray.reduce((acc, item) => {
  acc[item.key] = item;
  return acc;
}, {} as Sitemap);
