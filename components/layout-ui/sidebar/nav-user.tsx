"use client";

import { BadgeCheck, LogOut, Settings, Sparkles } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import UserAvatar from "@/components/user/user-avatar";
import { SIGNOUT_PATH } from "@/features/auth/infrastructure/auth-constants";
import { CurrentUserInfo } from "next-auth";

interface NavUserProps {
  currentUser?: CurrentUserInfo | null;
  /** Optional trigger for sidebar use (e.g. SidebarMenuButton). When provided, used instead of default avatar. */
  trigger?: React.ReactNode;
}

const NavUser = ({ currentUser, trigger }: NavUserProps) => {
  const { isMobile } = useSidebar();
  const isLoggedIn = currentUser !== null;
  const loginStatus = isLoggedIn ? "Signed in" : "Sign in";
  const { displayName, initials, email } = currentUser ?? {};

  const defaultTrigger = (
    <button type="button" aria-label="my-account-dropdown">
      <UserAvatar
        className="h-9 w-9"
        isLoggedIn={isLoggedIn}
        displayName={displayName}
      />
    </button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild aria-label="my-account-dropdown">
        {trigger ?? defaultTrigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
        side={isMobile ? "bottom" : "right"}
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src="" alt={displayName} />
              <AvatarFallback className="rounded-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{email}</span>
              <span className="truncate text-xs text-muted-foreground">
                {loginStatus}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoggedIn ? (
          <>
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="#">
                  <Sparkles />
                  Upgrade to Pro
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/settings/security">
                  <Settings />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/security">
                  <BadgeCheck />
                  Account
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={SIGNOUT_PATH}>
                <LogOut />
                Sign out
              </Link>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/login">
                  <Sparkles />
                  Sign in
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NavUser;
