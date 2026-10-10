import {
  BarChart3,
  LayoutDashboard,
  List,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Icons a server-built navigation model can name. Components cannot cross from a server
 * component into a client one, so models carry the name and the menu resolves it here.
 */
export const NAV_ICONS = Object.freeze({
  "layout-dashboard": LayoutDashboard,
  list: List,
  users: Users,
  "bar-chart": BarChart3,
  settings: Settings,
} satisfies Record<string, LucideIcon>);

export type NavIconName = keyof typeof NAV_ICONS;
