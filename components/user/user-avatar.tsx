"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import userAvatarImage from "@/public/assets/images/avatars/placeholder-user.jpg";
import { getInitials } from "@/features/users/user-utils";

interface UserAvatarProps extends React.ComponentProps<typeof Avatar> {
  isLoggedIn?: boolean;
  displayName?: string;
  className?: string;
  onClick?: () => void;
}

const UserAvatar = ({
  isLoggedIn = false,
  displayName,
  className,
  onClick,
  ...props
}: UserAvatarProps) => {
  const initials = getInitials(displayName ?? "");

  return (
    <Avatar className={className} onClick={onClick} {...props}>
      <AvatarImage src={userAvatarImage.src} alt={displayName} />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
