import MainHeader from "@/components/layout-ui/header/main-header";
import FormsBreadcrumbNav from "@/components/layout-ui/navigation/forms-breadcrumb-nav";
import type { FormsBreadcrumbItem } from "@/features/folders/types";
import type { Route } from "next";

const formsSectionBreadcrumbItems: FormsBreadcrumbItem[] = [
  {
    type: "link",
    label: "Forms",
    href: "/forms" as Route,
  },
];

export default function FormsCatchAllHeaderSlot() {
  return (
    <MainHeader
      sticky
      breadcrumb={<FormsBreadcrumbNav items={formsSectionBreadcrumbItems} />}
    />
  );
}
