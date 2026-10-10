"use client";

import Link from "next/link";
import type { Route } from "next";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NAV_ICONS, type NavIconName } from "./nav-icons";

export type NavSwitcherOption = {
  label: string;
  href: Route;
  isActive?: boolean;
  icon?: NavIconName;
};

export type NavSwitcherModel = {
  label: string;
  /** The current option's icon, shown on the trigger so it reads as a control. */
  icon?: NavIconName;
  options: NavSwitcherOption[];
};

function NavSwitcherTrigger({
  label,
  icon,
}: Readonly<Omit<NavSwitcherModel, "options">>) {
  const Icon = icon ? NAV_ICONS[icon] : null;
  return (
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        className="-mx-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-foreground transition-colors hover:bg-muted data-[state=open]:bg-muted"
        aria-label={`${label} navigation`}
      >
        {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
        {label}
        <ChevronDownIcon className="size-3.5 text-muted-foreground" />
      </button>
    </DropdownMenuTrigger>
  );
}

function NavSwitcherItem({ option }: Readonly<{ option: NavSwitcherOption }>) {
  const Icon = option.icon ? NAV_ICONS[option.icon] : null;
  return (
    <DropdownMenuItem asChild>
      <Link
        href={option.href}
        aria-current={option.isActive ? "page" : undefined}
        className={option.isActive ? "font-medium" : ""}
      >
        {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
        <span className="flex-1">{option.label}</span>
        {option.isActive ? <CheckIcon className="size-4" /> : null}
      </Link>
    </DropdownMenuItem>
  );
}

/**
 * The current choice among siblings, as a menu: folders in the forms trail, or the aspects of a
 * record after it. The current option is checked.
 */
export function NavSwitcher({
  options,
  ...trigger
}: Readonly<NavSwitcherModel>) {
  return (
    <DropdownMenu>
      <NavSwitcherTrigger {...trigger} />
      <DropdownMenuContent align="start" className="min-w-48">
        <DropdownMenuGroup>
          {options.map((option) => (
            <NavSwitcherItem key={option.href} option={option} />
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
