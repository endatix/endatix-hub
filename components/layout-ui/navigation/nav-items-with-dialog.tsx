"use client";

import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import NavLink from "./nav-link";
import { ComingSoonDialog } from "./coming-soon-dialog";

interface NavItemData {
  path: string;
  text: string;
  icon: React.ReactNode;
}

interface NavItemsWithDialogProps {
  navItems: NavItemData[];
}

export function NavItemsWithDialog({ navItems }: NavItemsWithDialogProps) {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    featureName: "",
  });

  const handleComingSoon = (featureName: string) => {
    setDialogState({ isOpen: true, featureName });
  };

  const closeDialog = () => {
    setDialogState({ isOpen: false, featureName: "" });
  };

  return (
    <>
      {navItems.map((navItem) => (
        <Tooltip key={navItem.text}>
          <TooltipTrigger asChild={false}>
            <NavLink 
              path={navItem.path} 
              text={navItem.text}
              onComingSoon={handleComingSoon}
            >
              {navItem.icon}
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right">{navItem.text}</TooltipContent>
        </Tooltip>
      ))}
      
      <ComingSoonDialog
        isOpen={dialogState.isOpen}
        onClose={closeDialog}
        featureName={dialogState.featureName}
      />
    </>
  );
} 