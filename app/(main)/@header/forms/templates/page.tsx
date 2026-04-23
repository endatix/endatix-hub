import MainHeader from "@/components/layout-ui/header/main-header";
import { Button } from "@/components/ui/button";
import { FilePlus2 } from "lucide-react";
import Link from "next/link";

export default function FormTemplatesHeaderSlot() {
  return (
    <MainHeader
      sticky
      actions={
        <Link href="/forms/templates/create">
          <Button variant="default">
            <FilePlus2 data-icon="inline-start" />
            Create a Form Template
          </Button>
        </Link>
      }
    />
  );
}
