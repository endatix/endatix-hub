import { PublicStatusPage } from "@/components/public-status/public-status-page";
import { SearchX } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Form Not Found",
  description: "The form you are requesting does not exist.",
};

export default function NotFoundSharedForm() {
  return (
    <PublicStatusPage
      icon={SearchX}
      message="Check the link and try again."
      title="We couldn't find that survey."
      tone="neutral"
      layout="page"
    />
  );
}
