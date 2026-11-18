"use client";

import { brandUrl, useBrand } from "@/lib/branding/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ComingSoonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
}

export function ComingSoonDialog({ isOpen, onClose, featureName }: ComingSoonDialogProps) {
  const brand = useBrand();
  const websiteUrl = brandUrl(
    brand,
    "website",
    // eslint-disable-next-line no-restricted-syntax -- built-in value, shown only while no brand pack applies
    "https://endatix.com?utm_source=endatix-hub&utm_medium=product",
  );
  const docsUrl = brandUrl(
    brand,
    "docs",
    // eslint-disable-next-line no-restricted-syntax -- built-in value, shown only while no brand pack applies
    "https://docs.endatix.com/docs/category/getting-started?utm_source=endatix-hub&utm_medium=product",
  );
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center">
            Coming soon
          </DialogTitle>
          <div className="mt-20" />
          <DialogDescription className="text-left px-4 leading-relaxed">
            <span className="font-semibold text-foreground">{featureName}</span> is coming soon!
            {brand.name} is the new exciting way to manage your data collection and processing workflows.
            We&apos;re constantly adding new features and enhancing existing ones to make your data management experience even better.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 justify-center">
          {websiteUrl ? (
            <Button asChild size="sm">
              <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
                Learn about {brand.shortName}
              </a>
            </Button>
          ) : null}
          {docsUrl ? (
            <Button asChild variant="secondary" size="sm">
              <a href={docsUrl} target="_blank" rel="noopener noreferrer">
                Read our Docs
              </a>
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 