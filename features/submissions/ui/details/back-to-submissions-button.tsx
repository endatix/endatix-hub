"use client";

import { Button } from "@/components/ui/button";
import { getSubmissionListReturnPath } from "@/features/submissions/list-submission-query";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";

interface BackToSubmissionsButtonProps extends React.ComponentProps<
  typeof Button
> {
  formId: string;
  text?: string;
}

export function BackToSubmissionsButton({
  formId,
  text = "Back to submissions",
  variant,
  ...props
}: BackToSubmissionsButtonProps) {
  const [href, setHref] = useState(`/forms/${formId}/submissions`);

  useEffect(() => {
    setHref(getSubmissionListReturnPath(formId));
  }, [formId]);

  return (
    <Button variant={variant} asChild {...props}>
      <Link href={href as Route} className="flex items-center gap-2">
        <ArrowLeftIcon className="h-4 w-4" />
        {text}
      </Link>
    </Button>
  );
}
