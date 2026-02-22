import { LucideIcon } from "lucide-react";

interface ISitemapItem {
  key: string;
  title: string;
  url: string;
  external?: boolean;
}
interface INavItem extends ISitemapItem {
  icon?: LucideIcon;
  children?: INavItem[];
}

export type { ISitemapItem, INavItem };
