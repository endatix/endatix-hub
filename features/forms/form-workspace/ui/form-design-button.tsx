import Link from "next/link";
import { FilePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getFormDesignHref,
  type FormWorkspaceSectionId,
} from "../form-workspace-sections";

type FormDesignButtonProps = {
  formId: string;
  /** The page the designer returns to when it is closed. */
  from?: FormWorkspaceSectionId;
  variant?: "outline" | "default";
};

/** Design is entered, not switched to: the editor takes the whole screen until it is closed. */
export function FormDesignButton({
  formId,
  from,
  variant = "outline",
}: Readonly<FormDesignButtonProps>) {
  return (
    <Button variant={variant} asChild>
      <Link href={getFormDesignHref(formId, from)}>
        <FilePen />
        Design
      </Link>
    </Button>
  );
}
