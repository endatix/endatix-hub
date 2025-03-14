import { INavItem } from "@/types/navigation-models";
import {
  Blocks,
  GitCompareArrows,
  Home,
  LayoutTemplate,
  LineChart,
  Settings,
  TextCursorInput,
  Users2,
} from "lucide-react";

export const HOME_ROUTE_PATH = "/";

const sitemapArray: INavItem[] = [
  {
    key: "home",
    text: "Home",
    path: "/",
    IconType: Home,
  },
  {
    key: "forms",
    text: "Forms",
    path: "/forms",
    IconType: TextCursorInput,
  },
  {
    key: "formTemplates",
    text: "Form Templates",
    path: "/forms/templates",
    IconType: LayoutTemplate,
  },
  {
    key: "customers",
    text: "Customers",
    path: "/",
    IconType: Users2,
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
    IconType: GitCompareArrows,
  },
  {
    key: "integrations",
    text: "Integrations",
    path: "/",
    IconType: Blocks,
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
