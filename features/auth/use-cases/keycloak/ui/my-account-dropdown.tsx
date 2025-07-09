"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import UserAvatar from "@/components/user/user-avatar";
import Link from "next/link";
import { Session } from "next-auth";
import SignOutButton from "./sign-out-button";
import SignInButton from "./sign-in-button";

export interface HeaderProps {
  session?: Session | null;
}

const MyAccountDropdown: React.FC<HeaderProps> = ({ session }) => {
  const isLoggedIn = !!session?.user;
  const userName = session?.user?.name;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="my-account-dropdown">
        <UserAvatar
          className="w-9 h-9"
          isLoggedIn={isLoggedIn}
          userName={userName ?? ""}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isLoggedIn ? (
          <LoggedInUserOptions userName={userName ?? ""} />
        ) : (
          <AnonymousUserOptions />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const AnonymousUserOptions = () => (
  <DropdownMenuItem>
    <SignInButton />
  </DropdownMenuItem>
);

const LoggedInUserOptions = ({ userName }: { userName: string }) => (
  <>
    <DropdownMenuLabel>My Account</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <Link href="/settings/security">Settings</Link>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <SignOutButton name={userName ?? ""} />
    </DropdownMenuItem>
  </>
);

export default MyAccountDropdown;
