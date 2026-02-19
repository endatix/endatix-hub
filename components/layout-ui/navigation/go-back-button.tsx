"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { type FC } from "react";

interface GoBackButtonProps extends React.ComponentProps<typeof Button> {
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
