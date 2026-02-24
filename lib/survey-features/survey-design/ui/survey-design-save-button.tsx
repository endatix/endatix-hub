"use client";

import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

export interface SurveyDesignSaveButtonProps extends React.ComponentProps<
  typeof Button
> {
  disabled: boolean;
  onClick: () => void;
  label?: string;
  savingLabel?: string;
  isPending?: boolean;
}

export function SurveyDesignSaveButton({
  label = "Save",
  savingLabel = "Saving...",
  isPending = false,
  children,
  ...props
}: Readonly<SurveyDesignSaveButtonProps>) {
  return (
    <Button
      {...props}
    >
      <Save className="mr-2 h-4 w-4" />
      {isPending ? savingLabel : label}
    </Button>
  );
}
