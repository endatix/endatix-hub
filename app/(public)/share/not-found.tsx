import { PublicStatusPage } from "@/components/public-status/public-status-page";
import { SearchX } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Page Not Found",
  description: "The page you are looking for does not exist.",
};

export default function NotFound() {
  return (
    <PublicStatusPage
      icon={SearchX}
      layout="page"
      message="Check the link and try again."
      title="We couldn't find that survey."
      tone="neutral"
    />
  );
}
