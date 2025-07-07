import { INavItem } from "@/types/navigation-models";
import {
  ClipboardList,
  LayoutTemplate,
  LineChart,
  Plug,
  Repeat,
  Settings,
} from "lucide-react";

export const HOME_ROUTE_PATH = "/";

const sitemapArray: INavItem[] = [
  {
    key: "forms",
    text: "Forms",
    path: "/forms",
    IconType: ClipboardList,
  },
  {
    key: "formTemplates",
    text: "Form Templates",
    path: "/forms/templates",
    IconType: LayoutTemplate,
  },
  {
    key: "analytics",
    text: "Analytics",
    path: "/",
    IconType: LineChart,
  },
  {
    key: "workflows",
    text: "Workflows",
    path: "/",
    IconType: Repeat,
  },
  {
    key: "integrations",
    text: "Integrations",
    path: "/",
    IconType: Plug,
  },
  {
    key: "settings",
    text: "Settings",
    path: "/settings/security",
    IconType: Settings,
  },
];

type Sitemap = {
  [key: string]: INavItem;
};

export const sitemap: Sitemap = sitemapArray.reduce((acc, item) => {
  acc[item.key] = item;
  return acc;
}, {} as Sitemap);
