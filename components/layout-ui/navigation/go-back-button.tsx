"use client";

import { Button, ButtonProps } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { FC } from "react";

interface GoBackButtonProps extends ButtonProps {
  text?: string;
}

const GoBackButton: FC<GoBackButtonProps> = ({
  text = "Cancel",
  variant,
  ...props
}) => {
  const router = useRouter();

  return (
    <Button
      variant={variant}
      type="button"
      onClick={() => router.back()}
      {...props}
    >
      {text}
    </Button>
  );
};

export default GoBackButton;
