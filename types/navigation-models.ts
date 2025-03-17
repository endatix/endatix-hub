import { LucideIcon } from "lucide-react";

interface ISitemapItem {
  key: string;
  text: string;
  path: string;
}
interface INavItem extends ISitemapItem {
  IconType: LucideIcon;
  children?: INavItem[];
}

export type { ISitemapItem, INavItem };
